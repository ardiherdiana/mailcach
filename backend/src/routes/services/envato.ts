import { Router } from "express"
import { authenticate, type AuthRequest } from "../../middleware/auth"
import { prisma } from "../../lib/prisma"
import { loadSession } from "../../lib/envato-session"

const router = Router()
router.use(authenticate)

export const ENVATO_PACKAGES = [
  { id: "lite-1d",  tier: "Lite", label: "1 Hari Lite",   days: 1,  filesPerDay: 10, files: 10,  price: 10_000 },
  { id: "lite-7d",  tier: "Lite", label: "1 Minggu Lite",  days: 7,  filesPerDay: 10, files: 70,  price: 15_000 },
  { id: "lite-30d", tier: "Lite", label: "1 Bulan Lite",   days: 30, filesPerDay: 10, files: 300, price: 45_000 },
  { id: "pro-1d",   tier: "Pro",  label: "1 Hari Pro",     days: 1,  filesPerDay: 20, files: 20,  price: 15_000 },
  { id: "pro-7d",   tier: "Pro",  label: "1 Minggu Pro",   days: 7,  filesPerDay: 20, files: 140, price: 25_000 },
  { id: "pro-30d",  tier: "Pro",  label: "1 Bulan Pro",    days: 30, filesPerDay: 20, files: 600, price: 65_000 },
] satisfies { id: string; tier: string; label: string; days: number; filesPerDay: number; files: number; price: number }[]

type PackageId = typeof ENVATO_PACKAGES[number]["id"]

async function fetchWithSession(url: string, init?: RequestInit) {
  const session = loadSession()
  if (!session) throw Object.assign(new Error("Session Envato belum diset. Admin perlu upload cookies di panel."), { status: 503 })
  return fetch(url, {
    ...init,
    headers: {
      "Cookie": session.cookies,
      "User-Agent": session.userAgent,
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://elements.envato.com",
      ...(init?.headers ?? {}),
    },
  })
}

async function getDownloadUrl(assetUrl: string): Promise<string> {
  const session = loadSession()
  if (!session) throw Object.assign(new Error("Session Envato belum diset."), { status: 503 })

  const itemCodeMatch = assetUrl.match(/[-\/]([A-Z0-9]{5,8})(?:\?|$)/i)
  const itemCode = itemCodeMatch?.[1] ?? ""
  if (!itemCode) throw new Error("Tidak bisa parse item code dari URL")

  const ndRes = await fetchWithSession(
    `https://elements.envato.com/data-api/modal/neue-download?type=neue-download&itemId=${itemCode}&languageCode=en`
  )
  const ndJson = await ndRes.json() as any
  const itemUuid = ndJson?.data?.item?.itemUuid
  const itemType = ndJson?.data?.item?.type ?? "web-templates"

  if (!itemUuid) throw new Error(`Gagal dapat UUID item (itemCode=${itemCode}, status=${ndRes.status})`)

  const dlRes = await fetchWithSession(
    `https://app.envato.com/download.data?itemUuid=${itemUuid}&itemType=${itemType}&_routes=routes%2Fdownload%2Froute`,
    { headers: { "Referer": `https://app.envato.com/${itemType}/${itemUuid}` } }
  )
  const dlText = await dlRes.text()
  if (!dlRes.ok) throw new Error(`download.data gagal (${dlRes.status})`)

  try {
    const arr = JSON.parse(dlText) as unknown[]
    for (let i = arr.length - 2; i >= 0; i--) {
      if (arr[i] === "downloadUrl" && typeof arr[i + 1] === "string") return arr[i + 1] as string
    }
    const fallback = arr.find(v => typeof v === "string" && (v as string).startsWith("https://") && (v as string).includes("envato"))
    if (fallback) return fallback as string
  } catch { /* ignore */ }

  throw new Error(`Tidak bisa parse download URL dari response: ${dlText.slice(0, 200)}`)
}


router.get("/status", async (req: AuthRequest, res) => {
  const now = new Date()
  const access = await prisma.envatoAccess.findFirst({
    where: { userId: req.userId, expiresAt: { gt: now } },
    orderBy: { expiresAt: "desc" },
  })
  if (!access) { res.json({ active: false }); return }
  res.json({
    active: true,
    packageId: access.packageId,
    filesRemaining: access.filesTotal - access.filesUsed,
    filesTotal: access.filesTotal,
    expiresAt: access.expiresAt,
    purchasedAt: access.purchasedAt,
  })
})

router.get("/packages", (_req, res) => {
  res.json(ENVATO_PACKAGES)
})

router.post("/buy", async (req: AuthRequest, res) => {
  const { packageId } = req.body as { packageId?: PackageId }
  const pkg = ENVATO_PACKAGES.find((p) => p.id === packageId)
  if (!pkg) { res.status(400).json({ error: "Paket tidak valid" }); return }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: req.userId }, select: { credits: true } })
      if (!user) throw Object.assign(new Error("User tidak ditemukan"), { status: 404 })
      if (user.credits < pkg.price)
        throw Object.assign(
          new Error(`Saldo tidak cukup. Dibutuhkan Rp ${pkg.price.toLocaleString("id-ID")}, saldo kamu Rp ${user.credits.toLocaleString("id-ID")}`),
          { status: 402 }
        )

      const updated = await tx.user.update({
        where: { id: req.userId },
        data: { credits: { decrement: pkg.price } },
        select: { credits: true },
      })

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + pkg.days)

      const access = await tx.envatoAccess.create({
        data: { userId: req.userId!, packageId: pkg.id, filesTotal: pkg.files, expiresAt },
      })

      await tx.transaction.create({
        data: {
          userId: req.userId!,
          service: "envato",
          type: "DEBIT",
          amount: pkg.price,
          description: `Beli paket Envato ${pkg.label} (${pkg.files} file)`,
          metadata: { packageId: pkg.id, label: pkg.label, days: pkg.days, files: pkg.files },
        },
      })

      return { remainingCredits: updated.credits, access }
    })

    res.status(201).json({
      remainingCredits: result.remainingCredits,
      filesRemaining: result.access.filesTotal,
      expiresAt: result.access.expiresAt,
    })
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.post("/download", async (req: AuthRequest, res) => {
  const { url } = req.body as { url?: string }
  if (!url?.trim()) { res.status(400).json({ error: "URL wajib diisi" }); return }

  try {
    const hostname = new URL(url.trim()).hostname.replace(/^www\./, "")
    if (hostname !== "elements.envato.com") {
      res.status(400).json({ error: "URL harus dari elements.envato.com" }); return
    }
  } catch {
    res.status(400).json({ error: "URL tidak valid" }); return
  }

  const assetTitle = (() => {
    try {
      const p = new URL(url.trim()).pathname
      return (p.split("/").filter(Boolean).pop() ?? "asset")
        .replace(/[-_]/g, " ").replace(/\.[^.]+$/, "").slice(0, 60)
    } catch { return "asset" }
  })()

  try {
    const quotaResult = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const access = await tx.envatoAccess.findFirst({
        where: { userId: req.userId, expiresAt: { gt: now } },
        orderBy: { expiresAt: "desc" },
      })
      if (!access) throw Object.assign(new Error("Kamu belum punya paket Envato aktif"), { status: 403 })
      if (access.filesUsed >= access.filesTotal)
        throw Object.assign(new Error("Kuota download paket kamu sudah habis"), { status: 403 })

      await tx.envatoAccess.update({ where: { id: access.id }, data: { filesUsed: { increment: 1 } } })
      await tx.transaction.create({
        data: {
          userId: req.userId!,
          service: "envato",
          type: "DEBIT",
          amount: 0,
          description: `Envato download - ${assetTitle}`,
          metadata: { assetUrl: url.trim(), assetTitle, packageId: access.packageId },
        },
      })
      return { filesRemaining: access.filesTotal - access.filesUsed - 1, expiresAt: access.expiresAt, accessId: access.id }
    })

    let downloadUrl: string
    try {
      downloadUrl = await getDownloadUrl(url.trim())
    } catch (fetchErr: any) {
      await prisma.envatoAccess.update({
        where: { id: quotaResult.accessId },
        data: { filesUsed: { decrement: 1 } },
      }).catch(() => {})
      throw fetchErr
    }

    const fileRes = await fetchWithSession(downloadUrl, { headers: { Accept: "*/*" } })
    if (!fileRes.ok || !fileRes.body) throw new Error(`Gagal download file dari Envato (${fileRes.status})`)

    const contentType = fileRes.headers.get("content-type") ?? "application/octet-stream"

    let filename = assetTitle + ".zip"
    try {
      const dlUrlObj = new URL(downloadUrl)
      const rcd = dlUrlObj.searchParams.get("response-content-disposition")
      if (rcd) {
        const utf8Match = rcd.match(/filename\*=UTF-8''(.+)/i)
        const plainMatch = rcd.match(/filename="?([^";]+)"?/i)
        filename = utf8Match ? decodeURIComponent(utf8Match[1]) : plainMatch ? plainMatch[1] : filename
      } else {
        const pathFile = dlUrlObj.pathname.split("/").pop()
        if (pathFile) filename = decodeURIComponent(pathFile)
      }
    } catch { /* pakai default */ }

    const contentDisposition = fileRes.headers.get("content-disposition") ?? `attachment; filename="${filename}"`

    res.setHeader("Content-Type", contentType)
    res.setHeader("Content-Disposition", contentDisposition)
    res.setHeader("X-Files-Remaining", quotaResult.filesRemaining)

    const { Readable } = await import("stream")
    Readable.fromWeb(fileRes.body as import("stream/web").ReadableStream).pipe(res)
  } catch (err: any) {
    if (!res.headersSent) res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
