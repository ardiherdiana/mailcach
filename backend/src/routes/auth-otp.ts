import { Router } from "express"
import bcrypt from "bcryptjs"
import { prisma } from "../lib/prisma"
import { storeOtp, verifyOtp, sendRegisterOtp, sendForgotPasswordOtp } from "../lib/email"

const router = Router()

// POST /api/auth/otp/send-register — kirim OTP verifikasi email setelah register
router.post("/otp/send-register", async (req, res) => {
  const { email, name } = req.body as { email?: string; name?: string }
  if (!email || !name) { res.status(400).json({ error: "Email dan nama wajib diisi" }); return }

  try {
    const otp = storeOtp(email, "register")
    await sendRegisterOtp(email, name, otp)
    res.json({ sent: true })
  } catch (err: any) {
    res.status(500).json({ error: "Gagal mengirim email. Coba lagi." })
  }
})

// POST /api/auth/otp/verify-register — verifikasi OTP (setelah register)
router.post("/otp/verify-register", async (req, res) => {
  const { email, otp } = req.body as { email?: string; otp?: string }
  if (!email || !otp) { res.status(400).json({ error: "Email dan OTP wajib diisi" }); return }

  const valid = verifyOtp(email, otp, "register")
  if (!valid) {
    res.status(400).json({ error: "Kode OTP salah atau sudah kadaluarsa" })
    return
  }
  res.json({ verified: true })
})

// POST /api/auth/forgot-password — cari user, kirim OTP reset
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string }
  if (!email) { res.status(400).json({ error: "Email wajib diisi" }); return }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    // Selalu respond sukses untuk keamanan (jangan expose apakah email terdaftar)
    if (user && user.password) {
      const otp = storeOtp(email, "reset")
      await sendForgotPasswordOtp(email, user.name, otp)
    }
    res.json({ sent: true })
  } catch (err: any) {
    res.status(500).json({ error: "Gagal mengirim email. Coba lagi." })
  }
})

// POST /api/auth/reset-password — verifikasi OTP + update password
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body as {
    email?: string
    otp?: string
    newPassword?: string
  }
  if (!email || !otp || !newPassword) {
    res.status(400).json({ error: "Email, OTP, dan password baru wajib diisi" })
    return
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password minimal 6 karakter" })
    return
  }

  const valid = verifyOtp(email, otp, "reset")
  if (!valid) {
    res.status(400).json({ error: "Kode OTP salah atau sudah kadaluarsa" })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { res.status(404).json({ error: "User tidak ditemukan" }); return }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  res.json({ success: true })
})

export default router
