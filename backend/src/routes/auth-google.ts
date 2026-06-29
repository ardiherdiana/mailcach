import { Router } from "express"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma"

const router = Router()

function signToken(id: number, role: "ADMIN" | "USER") {
  return jwt.sign({ sub: id, role }, process.env.JWT_SECRET!, { expiresIn: "7d" })
}

router.post("/google", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string }
  if (!accessToken) {
    res.status(400).json({ error: "Access token Google wajib diisi" })
    return
  }

  try {
    // Verifikasi access token via Google userinfo endpoint
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!userInfoRes.ok) {
      res.status(401).json({ error: "Token Google tidak valid atau sudah kadaluarsa" })
      return
    }

    const userInfo = (await userInfoRes.json()) as {
      sub: string
      email: string
      name?: string
      email_verified?: boolean
    }

    if (!userInfo.email || !userInfo.sub) {
      res.status(400).json({ error: "Tidak bisa mengambil data akun Google" })
      return
    }

    const { sub: googleId, email, name } = userInfo

    // Cari berdasarkan googleId dulu (prioritas utama)
    let user = await prisma.user.findUnique({ where: { googleId } })

    if (!user) {
      // Fallback: cek apakah ada akun email lama dengan email yang sama (linking)
      // Hanya link kalau akun belum punya googleId (belum terhubung Google lain)
      const byEmail = await prisma.user.findUnique({ where: { email } })
      if (byEmail && !byEmail.googleId) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId },
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name ?? email.split("@")[0],
          email,
          googleId,
          password: null,
        },
      })
    }

    const token = signToken(user.id, user.role)
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, credits: user.credits },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Login Google gagal" })
  }
})

export default router
