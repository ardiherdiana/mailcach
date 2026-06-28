import { Router } from "express"
import { authenticate, type AuthRequest } from "../middleware/auth"
import { prisma } from "../lib/prisma"

const router = Router()
router.use(authenticate)

router.post("/redeem", async (req: AuthRequest, res) => {
  const { code } = req.body as { code?: string }
  if (!code?.trim()) {
    res.status(400).json({ error: "Kode voucher wajib diisi" })
    return
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.findUnique({ where: { code: code.trim().toUpperCase() } })
      if (!voucher) throw Object.assign(new Error("Voucher tidak ditemukan"), { status: 404 })
      if (voucher.isUsed) throw Object.assign(new Error("Voucher sudah digunakan"), { status: 409 })

      await tx.voucher.update({ where: { id: voucher.id }, data: { isUsed: true } })
      await tx.voucherRedemption.create({ data: { voucherId: voucher.id, userId: req.userId! } })
      const updated = await tx.user.update({
        where: { id: req.userId },
        data: { credits: { increment: voucher.amount } },
        select: { credits: true },
      })
      await tx.transaction.create({
        data: {
          userId: req.userId!,
          service: "voucher",
          type: "CREDIT",
          amount: voucher.amount,
          description: `Redeem voucher ${voucher.code}`,
          metadata: { code: voucher.code },
        },
      })
      return { amount: voucher.amount, newBalance: updated.credits }
    })

    res.json(result)
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
