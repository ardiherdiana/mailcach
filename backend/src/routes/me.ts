import { Router } from "express"
import bcrypt from "bcryptjs"
import { authenticate, type AuthRequest } from "../middleware/auth"
import { prisma } from "../lib/prisma"
import { storeOtp, verifyOtp, sendRegisterOtp } from "../lib/email"

const router = Router()
router.use(authenticate)

router.get("/", async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, credits: true, createdAt: true, password: true, googleId: true },
  })
  if (!user) { res.status(404).json({ error: "User tidak ditemukan" }); return }
  const { password, googleId, ...rest } = user
  res.json({ ...rest, hasPassword: !!password, isGoogleLinked: !!googleId })
})

// PATCH /api/me/profile — ganti nama
router.patch("/profile", async (req: AuthRequest, res) => {
  const { name } = req.body as { name?: string }
  if (!name?.trim() || name.trim().length < 2) {
    res.status(400).json({ error: "Nama minimal 2 karakter" }); return
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { name: name.trim() },
    select: { id: true, name: true, email: true, role: true, credits: true },
  })
  res.json(user)
})

// POST /api/me/change-email/send — kirim OTP ke email baru
router.post("/change-email/send", async (req: AuthRequest, res) => {
  const { newEmail } = req.body as { newEmail?: string }
  if (!newEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    res.status(400).json({ error: "Email tidak valid" }); return
  }
  const exists = await prisma.user.findUnique({ where: { email: newEmail.trim() } })
  if (exists) { res.status(409).json({ error: "Email sudah digunakan akun lain" }); return }

  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } })
  if (!user) { res.status(404).json({ error: "User tidak ditemukan" }); return }

  try {
    const otp = storeOtp(newEmail.trim(), "register")
    await sendRegisterOtp(newEmail.trim(), user.name, otp)
    res.json({ sent: true })
  } catch {
    res.status(500).json({ error: "Gagal mengirim email. Coba lagi." })
  }
})

// POST /api/me/change-email/verify — verifikasi OTP + update email
router.post("/change-email/verify", async (req: AuthRequest, res) => {
  const { newEmail, otp } = req.body as { newEmail?: string; otp?: string }
  if (!newEmail || !otp) { res.status(400).json({ error: "Email dan OTP wajib diisi" }); return }

  const valid = verifyOtp(newEmail, otp, "register")
  if (!valid) { res.status(400).json({ error: "Kode OTP salah atau sudah kadaluarsa" }); return }

  const exists = await prisma.user.findUnique({ where: { email: newEmail } })
  if (exists) { res.status(409).json({ error: "Email sudah digunakan akun lain" }); return }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { email: newEmail },
    select: { id: true, name: true, email: true, role: true, credits: true },
  })
  res.json(user)
})

// POST /api/me/change-password — ganti atau set password
router.post("/change-password", async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Password baru minimal 6 karakter" }); return
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { password: true, googleId: true } })
  if (!user) { res.status(404).json({ error: "User tidak ditemukan" }); return }

  // Akun dengan password existing: wajib verifikasi password lama
  if (user.password) {
    if (!currentPassword) { res.status(400).json({ error: "Password saat ini wajib diisi" }); return }
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) { res.status(400).json({ error: "Password saat ini salah" }); return }
  }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } })
  res.json({ success: true })
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
