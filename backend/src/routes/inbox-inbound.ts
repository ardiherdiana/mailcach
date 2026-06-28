import { Router } from "express"
import crypto from "crypto"
import { simpleParser } from "mailparser"
import { prisma } from "../lib/prisma"

const router = Router()

const INBOX_DOMAIN = process.env.INBOX_DOMAIN ?? "mailcach.com"
const WORKER_SECRET = process.env.WORKER_SECRET ?? ""
const MAX_AGE_SECONDS = 24 * 60 * 60

router.post("/", async (req, res) => {
  if (WORKER_SECRET) {
    const secret = req.headers["x-worker-secret"]
    if (secret !== WORKER_SECRET) {
      res.status(401).send("Unauthorized")
      return
    }
  }

  try {
    const { messageId, subject, from: sender, to: recipient, rawEmail } = req.body as {
      messageId?: string
      subject?: string
      from?: string
      to?: string
      rawEmail?: string
    }

    const cleanRecipient = (recipient ?? "").toLowerCase()
    if (!cleanRecipient.endsWith(`@${INBOX_DOMAIN}`)) {
      res.status(200).send("OK")
      return
    }

    const id = (messageId ?? "").replace(/[<>]/g, "") || crypto.randomUUID()

    const parsed = await simpleParser(rawEmail ?? "")
    const bodyPlain = parsed.text ?? ""
    const bodyHtml = parsed.html || ""
    const ts = Math.floor(Date.now() / 1000)

    await prisma.inboxEmail.upsert({
      where: { id },
      create: {
        id,
        subject: subject ?? "",
        sender: sender ?? "",
        recipient: cleanRecipient,
        body: bodyPlain,
        bodyHtml,
        timestamp: ts,
      },
      update: {},
    })

    const cutoff = ts - MAX_AGE_SECONDS
    prisma.inboxEmail.deleteMany({ where: { timestamp: { lt: cutoff } } }).catch(() => {})

    res.status(200).send("OK")
  } catch (err) {
    console.error("[inbox-inbound]", err)
    res.status(500).send("Error")
  }
})

export default router
