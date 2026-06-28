import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10)
  await prisma.user.upsert({
    where: { email: "admin@mailcach.com" },
    update: {},
    create: { name: "Admin", email: "admin@mailcach.com", password: adminHash, role: "ADMIN", credits: 0 },
  })

  const userHash = await bcrypt.hash("user123", 10)
  await prisma.user.upsert({
    where: { email: "user@mailcach.com" },
    update: {},
    create: { name: "Test User", email: "user@mailcach.com", password: userHash, role: "USER", credits: 50_000 },
  })

  console.log("✅ Seed selesai")
  console.log("   Admin : admin@mailcach.com / admin123")
  console.log("   User  : user@mailcach.com  / user123  (saldo Rp 50.000)")
}

main().catch(console.error).finally(() => prisma.$disconnect())
