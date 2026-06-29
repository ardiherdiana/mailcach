import { Router } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { authenticate, type AuthRequest } from "../../middleware/auth"
import { prisma } from "../../lib/prisma"

const router = Router()
router.use(authenticate)

const UPLOAD_DIR = path.join(process.cwd(), "data", "turnitin-uploads")
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const CREDITS_PER_CHECK = 10_000

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      cb(null, `${unique}-${file.originalname}`)
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|docx|doc|txt)$/i.test(file.originalname) ||
      ["application/pdf",
       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
       "application/msword",
       "text/plain"].includes(file.mimetype)
    cb(null, ok)
  },
})

// POST /services/turnitin/submit — user upload file
router.post("/submit", upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "File wajib diupload (.pdf, .docx, .doc, .txt, maks 20 MB)" })
    return
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { credits: true } })
    if (!user) { res.status(404).json({ error: "User tidak ditemukan" }); return }
    if (user.credits < CREDITS_PER_CHECK) {
      fs.unlinkSync(req.file.path)
      res.status(402).json({
        error: `Saldo tidak cukup. Dibutuhkan Rp ${CREDITS_PER_CHECK.toLocaleString("id-ID")}, saldo kamu Rp ${user.credits.toLocaleString("id-ID")}`,
      })
      return
    }

    const job = await prisma.turnitinJob.create({
      data: {
        userId: req.userId!,
        filename: req.file.originalname,
        fileSizeBytes: req.file.size,
        uploadPath: req.file.path,
        status: "PENDING",
      },
    })

    res.json({ jobId: job.id, filename: job.filename, status: job.status, createdAt: job.createdAt })
  } catch (err: any) {
    if (req.file) fs.unlinkSync(req.file.path)
    res.status(500).json({ error: err.message })
  }
})

// GET /services/turnitin/jobs — list user's jobs
router.get("/jobs", async (req: AuthRequest, res) => {
  try {
    const jobs = await prisma.turnitinJob.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        fileSizeBytes: true,
        status: true,
        similarityScore: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    res.json(jobs)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /services/turnitin/jobs/:id/download — download result PDF
router.get("/jobs/:id/download", async (req: AuthRequest, res) => {
  try {
    const job = await prisma.turnitinJob.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
    })
    if (!job) { res.status(404).json({ error: "Job tidak ditemukan" }); return }
    if (job.status !== "COMPLETED" || !job.resultPath) {
      res.status(404).json({ error: "Hasil belum tersedia" })
      return
    }
    if (!fs.existsSync(job.resultPath)) {
      res.status(404).json({ error: "File hasil tidak ditemukan" })
      return
    }
    const name = `laporan-turnitin-${job.filename.replace(/\.[^.]+$/, "")}.pdf`
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`)
    res.setHeader("Content-Type", "application/pdf")
    fs.createReadStream(job.resultPath).pipe(res)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
