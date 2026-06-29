import { Router } from "express"
import { authenticate } from "../../middleware/auth"
import { requireRole } from "../../middleware/auth"
import { loadSession, saveSession, clearSession, parseNetscapeCookies } from "../../lib/envato-session"

const router = Router()
router.use(authenticate, requireRole("ADMIN"))

router.get("/", (_req, res) => {
  const session = loadSession()
  if (!session) { res.json({ active: false }); return }
  res.json({
    active: true,
    updatedAt: session.updatedAt,
    note: session.note,
    cookiePreview: session.cookies.slice(0, 40) + "…",
  })
})

router.post("/", (req, res) => {
  const { cookies, userAgent, note } = req.body as { cookies?: string; userAgent?: string; note?: string }
  if (!cookies?.trim()) { res.status(400).json({ error: "Cookies wajib diisi" }); return }
  const parsed = parseNetscapeCookies(cookies.trim())
  const session = saveSession({
    cookies: parsed.header,
    rawCookies: parsed.cookies,
    userAgent: userAgent?.trim() || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    note,
  })
  res.json({ active: true, updatedAt: session.updatedAt })
})

router.delete("/", (_req, res) => {
  clearSession()
  res.json({ active: false })
})

router.get("/debug-no-proxy", async (req, res) => {
  const { url } = req.query as { url?: string }
  if (!url) { res.status(400).json({ error: "url query param wajib" }); return }

  const session = loadSession()
  if (!session) { res.status(503).json({ error: "Session belum diset" }); return }

  try {
    const itemCodeMatch = url.match(/[-\/]([A-Z0-9]{5,8})(?:\?|$)/i)
    const itemCode = itemCodeMatch?.[1] ?? ""

    const headers = {
      "Cookie": session.cookies,
      "User-Agent": session.userAgent,
      "Accept": "application/json",
      "Referer": "https://elements.envato.com",
    }

    const ndUrl = `https://elements.envato.com/data-api/modal/neue-download?type=neue-download&itemId=${itemCode}&languageCode=en`
    const ndRes = await fetch(ndUrl, { headers })
    const ndJson = await ndRes.json() as any
    const itemUuid = ndJson?.data?.item?.itemUuid
    const itemType = ndJson?.data?.item?.type ?? "web-templates"

    if (!itemUuid) {
      res.json({ step: "neue-download", status: ndRes.status, response: ndJson }); return
    }

    const dlUrl = `https://app.envato.com/download.data?itemUuid=${itemUuid}&itemType=${itemType}&_routes=routes%2Fdownload%2Froute`
    const dlRes = await fetch(dlUrl, {
      headers: { ...headers, "Referer": `https://app.envato.com/${itemType}/${itemUuid}` }
    })
    const dlText = await dlRes.text()

    res.json({
      itemCode, itemUuid, itemType,
      downloadStep: { status: dlRes.status, body: dlText.slice(0, 500) }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/debug-asset", async (req, res) => {
  const { url } = req.query as { url?: string }
  if (!url) { res.status(400).json({ error: "url query param wajib diisi" }); return }

  const session = loadSession()
  if (!session) { res.status(503).json({ error: "Session belum diset" }); return }

  try {
    const r = await fetch(url, {
      headers: {
        "Cookie": session.cookies,
        "User-Agent": session.userAgent,
        "Accept": "text/html,application/xhtml+xml",
        "Referer": "https://elements.envato.com",
      },
    })
    const html = await r.text()
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/)
    if (!match) {
      res.json({ status: r.status, hasNextData: false, htmlSnippet: html.slice(0, 500) })
      return
    }
    const data = JSON.parse(match[1])
    res.json({ status: r.status, hasNextData: true, nextData: data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
