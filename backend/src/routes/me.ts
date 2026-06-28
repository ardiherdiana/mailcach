import { Router } from "express"
import { authenticate, type AuthRequest } from "../middleware/auth"
import { prisma } from "../lib/prisma"

const router = Router()
router.use(authenticate)

router.get("/", async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, credits: true, createdAt: true },
  })
  if (!user) { res.status(404).json({ error: "User tidak ditemukan" }); return }
  res.json(user)
})

router.get("/transactions", async (req: AuthRequest, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  res.json(transactions)
})

export default router
