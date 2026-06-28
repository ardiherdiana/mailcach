import { Router } from "express"
import { authenticate, requireRole, type AuthRequest } from "../../middleware/auth"
import { prisma } from "../../lib/prisma"

const router = Router()
router.use(authenticate, requireRole("ADMIN"))

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, credits: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  res.json(users)
})

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  const { role, credits } = req.body as { role?: "ADMIN" | "USER"; credits?: number }

  if (id === req.userId) {
    res.status(400).json({ error: "Tidak bisa mengubah akun sendiri" })
    return
  }

  const data: Record<string, unknown> = {}
  if (role !== undefined) data.role = role
  if (credits !== undefined) {
    if (!Number.isInteger(credits) || credits < 0) {
      res.status(400).json({ error: "Nilai kredit tidak valid" })
      return
    }
    data.credits = credits
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: "Tidak ada data yang diubah" })
    return
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, credits: true },
    })
    res.json(user)
  } catch {
    res.status(404).json({ error: "User tidak ditemukan" })
  }
})

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id)
  if (id === req.userId) {
    res.status(400).json({ error: "Tidak bisa menghapus akun sendiri" })
    return
  }
  try {
    await prisma.user.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: "User tidak ditemukan" })
  }
})

export default router
