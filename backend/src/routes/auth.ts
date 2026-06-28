import { Router } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma"

const router = Router()

function signToken(id: number, role: "ADMIN" | "USER") {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET!, { expiresIn: "7d" })
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string
    email?: string
    password?: string
  }

  if (!name || !email || !password) {
    res.status(400).json({ error: "Nama, email, dan password wajib diisi" })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password minimal 6 karakter" })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: "Email sudah terdaftar" })
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  })

  const token = signToken(user.id, user.role)
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, credits: user.credits },
  })
})

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ error: "Email dan password wajib diisi" })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Email atau password salah" })
    return
  }

  const token = signToken(user.id, user.role)
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, credits: user.credits },
  })
})

export default router
