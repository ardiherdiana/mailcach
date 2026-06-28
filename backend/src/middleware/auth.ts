import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export interface AuthRequest extends Request {
  userId?: number
  userRole?: "ADMIN" | "USER"
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token tidak ditemukan" })
    return
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as unknown as {
      sub: number
      role: "ADMIN" | "USER"
    }
    req.userId = payload.sub
    req.userRole = payload.role
    next()
  } catch {
    res.status(401).json({ error: "Token tidak valid atau sudah kedaluwarsa" })
  }
}

export function requireRole(...roles: ("ADMIN" | "USER")[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: "Akses ditolak" })
      return
    }
    next()
  }
}
