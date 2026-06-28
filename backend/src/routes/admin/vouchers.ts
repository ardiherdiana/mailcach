import { Router } from "express"
import { authenticate, requireRole, type AuthRequest } from "../../middleware/auth"
import { prisma } from "../../lib/prisma"

const router = Router()
router.use(authenticate, requireRole("ADMIN"))

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

router.get("/", async (_req, res) => {
  const vouchers = await prisma.voucher.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      redemption: { include: { user: { select: { name: true, email: true } } } },
    },
  })
  res.json(vouchers)
})

router.post("/", async (req: AuthRequest, res) => {
  const { amount, code } = req.body as { amount?: number; code?: string }

  if (!amount || !Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "Jumlah kredit tidak valid" })
    return
  }

  const finalCode = code?.trim().toUpperCase() || generateCode()

  try {
    const voucher = await prisma.voucher.create({
      data: { code: finalCode, amount, createdById: req.userId! },
      include: { createdBy: { select: { name: true } } },
    })
    res.status(201).json(voucher)
  } catch {
    res.status(409).json({ error: "Kode voucher sudah digunakan" })
  }
})

router.delete("/:id", async (_req, res) => {
  const id = Number(_req.params.id)
  try {
    const voucher = await prisma.voucher.findUnique({ where: { id } })
    if (!voucher) { res.status(404).json({ error: "Voucher tidak ditemukan" }); return }
    if (voucher.isUsed) { res.status(400).json({ error: "Tidak bisa hapus voucher yang sudah digunakan" }); return }
    await prisma.voucher.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: "Voucher tidak ditemukan" })
  }
})

export default router
