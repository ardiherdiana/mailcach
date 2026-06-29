import { Router } from "express"
import { authenticate, requireRole } from "../../middleware/auth"
import { loadTurnitinSession, saveTurnitinSession, clearTurnitinSession, parseTurnitinCookies } from "../../lib/turnitin-session"

const router = Router()
router.use(authenticate, requireRole("ADMIN"))

router.get("/", (_req, res) => {
  const session = loadTurnitinSession()
  if (!session) { res.json({ active: false }); return }
  res.json({
    active: true,
    updatedAt: session.updatedAt,
    note: session.note,
    assignmentId: session.assignmentId,
    authorId: session.authorId,
    cookiePreview: session.cookies.slice(0, 40) + "…",
  })
})

router.post("/", (req, res) => {
  const { cookies, userAgent, assignmentId, authorId, note } = req.body as {
    cookies?: string
    userAgent?: string
    assignmentId?: string
    authorId?: string
    note?: string
  }
  if (!cookies?.trim()) { res.status(400).json({ error: "Cookies wajib diisi" }); return }
  if (!assignmentId?.trim()) { res.status(400).json({ error: "Assignment ID wajib diisi" }); return }
  if (!authorId?.trim()) { res.status(400).json({ error: "Author ID wajib diisi" }); return }

  const parsed = parseTurnitinCookies(cookies.trim())
  const session = saveTurnitinSession({
    cookies: parsed,
    userAgent: userAgent?.trim() || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    assignmentId: assignmentId.trim(),
    authorId: authorId.trim(),
    note,
  })
  res.json({ active: true, updatedAt: session.updatedAt })
})

router.delete("/", (_req, res) => {
  clearTurnitinSession()
  res.json({ active: false })
})

// Auto-detect assignmentId + authorId from cookies
router.post("/detect", async (req, res) => {
  const { cookies } = req.body as { cookies?: string }
  if (!cookies?.trim()) { res.status(400).json({ error: "Cookies wajib diisi" }); return }

  const cookieHeader = parseTurnitinCookies(cookies.trim())

  try {
    // Extract assignmentId from cwr_s cookie (contains last visited page)
    const cwrMatch = cookies.match(/cwr_s\s+\S+\s+\S+\s+\S+\s+\S+\s+cwr_s\s+(\S+)/) ||
      cookies.match(/cwr_s\t[^\t]+\t[^\t]+\t[^\t]+\t[^\t]+\t[^\t]+\t([^\t\n]+)/) ||
      cookies.match(/cwr_s\s*=\s*([^\s;]+)/)

    let assignmentId: string | null = null

    if (cwrMatch?.[1]) {
      try {
        const decoded = JSON.parse(Buffer.from(decodeURIComponent(cwrMatch[1]), "base64").toString("utf8"))
        const pageId: string = decoded?.page?.pageId ?? ""
        const match = pageId.match(/\/dashboard\/(\d+)/)
        if (match) assignmentId = match[1]
      } catch {}
    }

    // Fallback: search raw cookies for dashboard path
    if (!assignmentId) {
      const rawMatch = cookies.match(/dashboard\/(\d+)/)
      if (rawMatch) assignmentId = rawMatch[1]
    }

    if (!assignmentId) {
      res.status(422).json({ error: "Tidak bisa detect Assignment ID dari cookies. Isi manual." })
      return
    }

    // Fetch upload page to get author_id
    const uploadUrl = `https://www.turnitin.com/api/lti/1p0/redirect/upload/assignment/${assignmentId}?lang=en_int`
    const uploadRes = await fetch(uploadUrl, {
      headers: {
        Cookie: cookieHeader,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
        Referer: "https://www.turnitin.com/",
      },
    })

    if (!uploadRes.ok) {
      res.status(422).json({ error: `Gagal akses Turnitin (${uploadRes.status}). Cookies mungkin expired.` })
      return
    }

    const html = await uploadRes.text()
    const authorMatch = html.match(/author_id:\s*(\d+)/)
    if (!authorMatch) {
      res.status(422).json({ error: "Tidak bisa detect Author ID. Pastikan cookies masih valid." })
      return
    }

    res.json({ assignmentId, authorId: authorMatch[1] })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
