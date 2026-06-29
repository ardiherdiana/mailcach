import puppeteerExtra from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import type { Browser } from "puppeteer"
import type { EnvatoSession } from "./envato-session"

puppeteerExtra.use(StealthPlugin())

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser
  browser = await puppeteerExtra.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--window-size=1920,1080",
      ...(process.env.ENVATO_PROXY ? (() => {
        const u = new URL(process.env.ENVATO_PROXY!)
        return [`--proxy-server=${u.protocol}//${u.host}`]
      })() : []),
    ],
  }) as unknown as Browser
  browser.on("disconnected", () => { browser = null })
  return browser
}

export async function getDownloadUrlViaBrowser(assetUrl: string, session: EnvatoSession): Promise<string> {
  const b = await getBrowser()
  const page = await b.newPage()

  try {
    if (process.env.ENVATO_PROXY) {
      const proxyUrl = new URL(process.env.ENVATO_PROXY)
      if (proxyUrl.username) {
        await page.authenticate({ username: proxyUrl.username, password: proxyUrl.password })
      }
    }

    await page.setUserAgent(session.userAgent)
    await page.setViewport({ width: 1920, height: 1080 })

    const baseCookies = (session.rawCookies ?? []).map((c) => ({
      name: c.name, value: c.value,
      path: c.path ?? "/", secure: c.secure,
      expires: c.expires || undefined,
    }))

    await page.setCookie(
      ...baseCookies.map(c => ({ ...c, domain: ".elements.envato.com" })),
      ...baseCookies.map(c => ({ ...c, domain: ".app.envato.com" })),
      ...baseCookies.map(c => ({ ...c, domain: ".envato.com" })),
    )

    if (!session.rawCookies?.length) {
      console.warn("[envato-browser] PERINGATAN: rawCookies kosong!")
    } else {
      console.log(`[envato-browser] set ${session.rawCookies.length} cookies (3 domains)`)
    }

    await page.goto(assetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })

    if ((await page.title()).toLowerCase().includes("just a moment")) {
      console.log("[envato-browser] CF challenge, menunggu...")
      try {
        await page.waitForFunction(
          () => !document.title.toLowerCase().includes("just a moment"),
          { timeout: 30_000, polling: 500 }
        )
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15_000 }).catch(() => {})
      } catch { console.warn("[envato-browser] CF challenge timeout") }
    }

    console.log(`[envato-browser] loaded: "${await page.title()}" | ${page.url()}`)

    await new Promise(r => setTimeout(r, 4000))

    const itemCodeMatch = assetUrl.match(/[-\/]([A-Z0-9]{5,8})(?:\?|$)/i)
    const itemCode = itemCodeMatch?.[1] ?? assetUrl.split("/").pop()?.split("-").pop() ?? ""
    console.log("[envato-browser] item code:", itemCode)

    const itemUuidData = await page.evaluate(async (code: string) => {
      const clientVersion = document.querySelector('meta[name="build-version"]')?.getAttribute("content") ?? ""
      const configCatCookie = document.cookie.split(";").find(c => c.trim().startsWith("CONFIGCAT_EXP_ENVATO="))
      const enrollments = configCatCookie ? encodeURIComponent(configCatCookie.split("=").slice(1).join("=").trim()) : ""

      const url = `/data-api/modal/neue-download?type=neue-download&itemId=${code}&languageCode=en&clientVersion=${clientVersion}&enrollments=${enrollments}`
      try {
        const r = await fetch(url, { credentials: "include" })
        const json = await r.json()
        const item = json?.data?.item
        return {
          itemUuid: item?.itemUuid ?? null,
          itemId: item?.id ?? null,
          title: item?.title ?? null,
          clientVersion,
          status: r.status,
        }
      } catch (e: any) {
        return { error: e.message, url }
      }
    }, itemCode)

    console.log("[envato-browser] neue-download result:", JSON.stringify(itemUuidData))

    if (!(itemUuidData as any)?.itemUuid) {
      throw new Error(`Gagal dapat UUID item. Response: ${JSON.stringify(itemUuidData).slice(0, 200)}`)
    }

    const uuid = (itemUuidData as any).itemUuid as string
    const dlType = "web-templates" 

    const downloadPage = await b.newPage()
    try {
      if (process.env.ENVATO_PROXY) {
        const proxyUrl = new URL(process.env.ENVATO_PROXY)
        if (proxyUrl.username) await downloadPage.authenticate({ username: proxyUrl.username, password: proxyUrl.password })
      }
      await downloadPage.setUserAgent(session.userAgent)
      await downloadPage.setCookie(
        ...baseCookies.map(c => ({ ...c, domain: ".app.envato.com" })),
        ...baseCookies.map(c => ({ ...c, domain: ".envato.com" })),
      )

      await downloadPage.goto(
        `https://app.envato.com/${dlType}/${uuid}`,
        { waitUntil: "domcontentloaded", timeout: 60_000 }
      )

      if ((await downloadPage.title()).toLowerCase().includes("just a moment")) {
        try {
          await downloadPage.waitForFunction(
            () => !document.title.toLowerCase().includes("just a moment"),
            { timeout: 30_000, polling: 500 }
          )
        } catch { console.warn("[envato-browser] CF challenge di app.envato.com") }
      }

      console.log(`[envato-browser] app.envato.com loaded: "${await downloadPage.title()}"`)

      const downloadUrl = await downloadPage.evaluate(async (itemUuid: string, type: string) => {
        const url = `/download.data?itemUuid=${itemUuid}&itemType=${type}&_routes=routes%2Fdownload%2Froute`
        const r = await fetch(url, {
          credentials: "include",
          headers: { "Accept": "*/*", "X-Requested-With": "XMLHttpRequest" },
        })
        if (!r.ok) return { error: `HTTP ${r.status}`, url }
        const text = await r.text()
        return { ok: true, text: text.slice(0, 1000) }
      }, uuid, dlType)

      console.log("[envato-browser] download.data result:", JSON.stringify(downloadUrl).slice(0, 500))

      if ((downloadUrl as any)?.ok) {
        try {
          const arr = JSON.parse((downloadUrl as any).text) as unknown[]
          let idx = -1
          for (let i = arr.length - 1; i >= 0; i--) {
            if (typeof arr[i] === "string" && arr[i] === "downloadUrl") { idx = i; break }
          }
          if (idx !== -1 && typeof arr[idx + 1] === "string") {
            return arr[idx + 1] as string
          }
          const dlUrl = arr.find((v) => typeof v === "string" && (v as string).startsWith("https://") && (v as string).includes("envato"))
          if (dlUrl) return dlUrl as string
        } catch { /* ignore */ }
      }

      throw new Error(`Gagal parse download URL. Response: ${JSON.stringify(downloadUrl).slice(0, 200)}`)
    } finally {
      await downloadPage.close()
    }
  } finally {
    await page.close()
  }
}

process.on("exit", () => { browser?.close().catch(() => {}) })
process.on("SIGINT", () => { browser?.close().catch(() => {}); process.exit(0) })
process.on("SIGTERM", () => { browser?.close().catch(() => {}); process.exit(0) })
