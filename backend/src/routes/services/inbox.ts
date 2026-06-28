import { Router } from "express"
import { authenticate, type AuthRequest } from "../../middleware/auth"
import { prisma } from "../../lib/prisma"

const router = Router()
router.use(authenticate)

const COST = 10
const INBOX_DOMAIN = process.env.INBOX_DOMAIN ?? "mailcach.com"

router.post("/search", async (req: AuthRequest, res) => {
  const { prefix } = req.body as { prefix?: string }

  if (!prefix?.trim()) { res.status(400).json({ error: "Prefix email wajib diisi" }); return }

  const cleanPrefix = prefix.trim().toLowerCase().replace(/@.*$/, "")
  if (!/^[a-z0-9._+%-]+$/.test(cleanPrefix)) {
    res.status(400).json({ error: "Prefix tidak valid (hanya huruf, angka, titik, strip, underscore)" }); return
  }

  const recipient = `${cleanPrefix}@${INBOX_DOMAIN}`

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: req.userId }, select: { credits: true } })
      if (!user) throw Object.assign(new Error("User tidak ditemukan"), { status: 404 })
      if (user.credits < COST)
        throw Object.assign(
          new Error(`Saldo tidak cukup. Dibutuhkan Rp ${COST}, saldo kamu Rp ${user.credits.toLocaleString("id-ID")}`),
          { status: 402 }
        )

      const updated = await tx.user.update({
        where: { id: req.userId },
        data: { credits: { decrement: COST } },
        select: { credits: true },
      })

      await tx.transaction.create({
        data: {
          userId: req.userId!,
          service: "inbox",
          type: "DEBIT",
          amount: COST,
          description: `Cek inbox ${recipient}`,
          metadata: { prefix: cleanPrefix, recipient },
        },
      })

      return { remainingCredits: updated.credits }
    })

    const emails = await prisma.inboxEmail.findMany({
      where: { recipient },
      orderBy: { timestamp: "desc" },
      select: { id: true, subject: true, sender: true, recipient: true, body: true, bodyHtml: true, timestamp: true },
    })

    res.json({
      ...result,
      prefix: cleanPrefix,
      domain: INBOX_DOMAIN,
      emails: emails.map((e) => ({
        id: e.id,
        subject: e.subject ?? "",
        sender: e.sender ?? "",
        recipient: e.recipient,
        body: e.body ?? "",
        body_html: e.bodyHtml ?? "",
        timestamp: e.timestamp,
      })),
    })
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

router.get("/detail", async (req: AuthRequest, res) => {
  const { messageId } = req.query as { messageId?: string }
  if (!messageId?.trim()) { res.status(400).json({ error: "messageId wajib diisi" }); return }

  try {
    const email = await prisma.inboxEmail.findUnique({ where: { id: messageId } })
    if (!email) { res.status(404).json({ success: false, error: "Email tidak ditemukan" }); return }

    res.json({
      success: true,
      email: {
        id: email.id,
        subject: email.subject ?? "",
        sender: email.sender ?? "",
        recipient: email.recipient,
        body: email.body ?? "",
        body_html: email.bodyHtml ?? "",
        timestamp: email.timestamp,
        hasHtml: !!email.bodyHtml,
      },
    })
  } catch {
    res.status(500).json({ error: "Gagal mengambil detail email" })
  }
})

export default router
