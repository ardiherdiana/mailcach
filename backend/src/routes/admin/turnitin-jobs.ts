import { Router } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { authenticate, requireRole } from "../../middleware/auth"
import { prisma } from "../../lib/prisma"

const router = Router()
router.use(authenticate, requireRole("ADMIN"))

const RESULT_DIR = path.join(process.cwd(), "data", "turnitin-results")
fs.mkdirSync(RESULT_DIR, { recursive: true })

const CREDITS_PER_CHECK = 10_000

const uploadResult = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, RESULT_DIR),
    filename: (req, _file, cb) => cb(null, `result-${req.params.id}-${Date.now()}.pdf`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname))
  },
})

// GET /admin/turnitin/jobs — semua job
router.get("/jobs", async (_req, res) => {
  try {
    const jobs = await prisma.turnitinJob.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    res.json(jobs)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /admin/turnitin/jobs/:id/file — admin download file asli user
router.get("/jobs/:id/file", async (req, res) => {
  try {
    const job = await prisma.turnitinJob.findUnique({ where: { id: Number(req.params.id) } })
    if (!job) { res.status(404).json({ error: "Job tidak ditemukan" }); return }
    if (!fs.existsSync(job.uploadPath)) { res.status(404).json({ error: "File tidak ditemukan" }); return }

    res.setHeader("Content-Disposition", `attachment; filename="${job.filename}"`)
    res.setHeader("Content-Type", "application/octet-stream")
    fs.createReadStream(job.uploadPath).pipe(res)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /admin/turnitin/jobs/:id/complete — upload hasil + potong kredit
router.post("/jobs/:id/complete", uploadResult.single("result"), async (req, res) => {
  const jobId = Number(req.params.id)
  const { similarityScore, adminNote } = req.body as { similarityScore?: string; adminNote?: string }

  if (!req.file) { res.status(400).json({ error: "File hasil PDF wajib diupload" }); return }

  const score = similarityScore ? parseInt(similarityScore, 10) : null
  if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
    fs.unlinkSync(req.file.path)
    res.status(400).json({ error: "Similarity score harus antara 0–100" })
    return
  }

  try {
    const job = await prisma.turnitinJob.findUnique({ where: { id: jobId } })
    if (!job) { fs.unlinkSync(req.file.path); res.status(404).json({ error: "Job tidak ditemukan" }); return }
    if (job.status === "COMPLETED") { fs.unlinkSync(req.file.path); res.status(400).json({ error: "Job sudah selesai" }); return }

    // Hapus result lama kalau ada
    if (job.resultPath && fs.existsSync(job.resultPath)) fs.unlinkSync(job.resultPath)

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: job.userId }, select: { credits: true } })
      if (!user) throw new Error("User tidak ditemukan")
      if (user.credits < CREDITS_PER_CHECK) throw new Error("Saldo user tidak cukup")

      await tx.user.update({
        where: { id: job.userId },
        data: { credits: { decrement: CREDITS_PER_CHECK } },
      })

      await tx.transaction.create({
        data: {
          userId: job.userId,
          service: "turnitin",
          type: "DEBIT",
          amount: CREDITS_PER_CHECK,
          description: `Cek Plagiarisme — ${job.filename}`,
          metadata: { jobId, similarityScore: score },
        },
      })

      await tx.turnitinJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          resultPath: req.file!.path,
          similarityScore: score,
          adminNote: adminNote?.trim() || null,
        },
      })
    })

    res.json({ success: true })
  } catch (err: any) {
    if (req.file) fs.unlinkSync(req.file.path)
    res.status(err.message?.includes("tidak cukup") ? 402 : 500).json({ error: err.message })
  }
})

// DELETE /admin/turnitin/jobs/:id — hapus job
router.delete("/jobs/:id", async (req, res) => {
  try {
    const job = await prisma.turnitinJob.findUnique({ where: { id: Number(req.params.id) } })
    if (!job) { res.status(404).json({ error: "Job tidak ditemukan" }); return }

    if (fs.existsSync(job.uploadPath)) fs.unlinkSync(job.uploadPath)
    if (job.resultPath && fs.existsSync(job.resultPath)) fs.unlinkSync(job.resultPath)

    await prisma.turnitinJob.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
