import { Router } from "express"
import { authenticate, type AuthRequest } from "../../middleware/auth"
import { prisma } from "../../lib/prisma"

const router = Router()
router.use(authenticate)

const CREDITS_PER_CHAR = 5
const API_KEY = () => process.env.ELEVENLABS_API_KEY ?? ""
const BASE = "https://api.elevenlabs.io/v1"

router.post("/generate", async (req: AuthRequest, res) => {
  const { script, voiceId, voiceLabel } = req.body as {
    script?: string
    voiceId?: string
    voiceLabel?: string
  }

  if (!script?.trim()) { res.status(400).json({ error: "Script wajib diisi" }); return }
  if (!voiceId?.trim()) { res.status(400).json({ error: "Voice ID wajib diisi" }); return }

  const characters = script.trim().length
  const cost = characters * CREDITS_PER_CHAR

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: req.userId }, select: { credits: true } })
      if (!user) throw Object.assign(new Error("User tidak ditemukan"), { status: 404 })
      if (user.credits < cost)
        throw Object.assign(
          new Error(`Saldo tidak cukup. Dibutuhkan Rp ${cost.toLocaleString("id-ID")}, saldo kamu Rp ${user.credits.toLocaleString("id-ID")}`),
          { status: 402 }
        )

      const updated = await tx.user.update({
        where: { id: req.userId },
        data: { credits: { decrement: cost } },
        select: { credits: true },
      })

      await tx.transaction.create({
        data: {
          userId: req.userId!,
          service: "elevenlabs",
          type: "DEBIT",
          amount: cost,
          description: `Voice generation - ${voiceLabel ?? voiceId}`,
          metadata: { voiceId, voiceLabel, characters, scriptSnippet: script.slice(0, 80) },
        },
      })

      return { creditsUsed: cost, remainingCredits: updated.credits }
    })

    let audioUrl: string | null = null
    if (API_KEY()) {
      try {
        const r = await fetch(`${BASE}/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: { "xi-api-key": API_KEY(), "Content-Type": "application/json" },
          body: JSON.stringify({
            text: script.trim(),
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        })
        if (r.ok) {
          const buf = await r.arrayBuffer()
          audioUrl = `data:audio/mpeg;base64,${Buffer.from(buf).toString("base64")}`
        }
      } catch {
        // audio gagal tapi kredit sudah dipotong — tetap return success
      }
    }

    res.json({ ...result, audioUrl })
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
