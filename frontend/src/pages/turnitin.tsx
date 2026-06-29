import { useState, useRef, useCallback, useEffect } from "react"
import {
  Upload, FileText, AlertCircle, Loader2,
  Download, Clock, CheckCircle2, XCircle, ShieldAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { LowCreditAlert } from "@/components/low-credit-alert"
import { useCredit } from "@/contexts/credit-context"
import { api, type TurnitinJob } from "@/lib/api"

const CREDITS_PER_CHECK = 10_000
const ACCEPTED = [".pdf", ".docx", ".doc", ".txt"]
const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function scoreColor(score: number) {
  if (score <= 15) return "text-green-600"
  if (score <= 30) return "text-amber-500"
  return "text-destructive"
}

function StatusBadge({ status }: { status: TurnitinJob["status"] }) {
  if (status === "PENDING") return <Badge variant="secondary" className="gap-1"><Clock className="size-3" />Menunggu Review</Badge>
  if (status === "COMPLETED") return <Badge className="gap-1 bg-green-500/15 text-green-600 hover:bg-green-500/20"><CheckCircle2 className="size-3" />Selesai</Badge>
  return <Badge variant="destructive" className="gap-1"><XCircle className="size-3" />Gagal</Badge>
}

export default function TurnitinPage() {
  const { credits, refresh } = useCredit()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [jobs, setJobs] = useState<TurnitinJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasEnough = credits >= CREDITS_PER_CHECK

  async function loadJobs() {
    try { setJobs(await api.services.turnitin.jobs()) }
    catch {}
    finally { setLoadingJobs(false) }
  }

  useEffect(() => { loadJobs() }, [])

  function handleFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
    if (!ACCEPTED.includes(`.${ext}`) && !ACCEPTED_MIME.includes(f.type)) return
    setFile(f)
    setError("")
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  async function handleSubmit() {
    if (!file || !hasEnough) return
    setSubmitting(true); setError(""); setConfirm(false)
    try {
      await api.services.turnitin.submit(file)
      setFile(null)
      refresh()
      await loadJobs()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim file")
    } finally { setSubmitting(false) }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <LowCreditAlert />

      <div>
        <h2 className="font-heading text-lg font-semibold">Cek Plagiarisme</h2>
        <p className="text-sm text-muted-foreground">Upload dokumen untuk dicek tingkat kemiripannya via Turnitin.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm">Upload Dokumen</CardTitle>
              <CardDescription>Format: PDF, DOCX, DOC, TXT · Maks. 20 MB</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors
                  ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"}
                  ${file ? "border-primary/40 bg-primary/5" : ""} flex-1 min-h-48`}
              >
                {file ? (
                  <>
                    <FileText className="size-10 text-primary" />
                    <div className="text-center">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-muted-foreground">
                      Ganti File
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="size-10 text-muted-foreground/50" />
                    <div className="text-center">
                      <p className="font-medium">Drag & drop atau klik untuk pilih file</p>
                      <p className="text-sm text-muted-foreground">PDF, DOCX, DOC, TXT — maks. 20 MB</p>
                    </div>
                  </>
                )}
              </div>
              <input ref={inputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

              {error && (
                <Alert className="border-destructive/30 bg-destructive/10">
                  <AlertCircle className="size-4 text-destructive" />
                  <AlertDescription className="text-xs text-destructive">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Biaya Cek</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per dokumen</span>
                <span className="font-semibold tabular-nums">Rp {CREDITS_PER_CHECK.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo kamu</span>
                <span className="tabular-nums">Rp {credits.toLocaleString("id-ID")}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sisa setelah cek</span>
                <span className={`font-semibold tabular-nums ${hasEnough ? "" : "text-destructive"}`}>
                  Rp {(credits - CREDITS_PER_CHECK).toLocaleString("id-ID")}
                </span>
              </div>
              {!hasEnough && (
                <Alert className="border-destructive/30 bg-destructive/10">
                  <AlertCircle className="size-4 text-destructive" />
                  <AlertDescription className="text-xs text-destructive">
                    Kurang Rp {(CREDITS_PER_CHECK - credits).toLocaleString("id-ID")}.{" "}
                    <a href="/dashboard/topup" className="underline">Top up dulu</a>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Cara Kerja</CardTitle></CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Upload dokumen kamu</li>
                <li>Tim kami proses via Turnitin</li>
                <li>Hasil laporan dikirim balik</li>
                <li>Kredit dipotong saat hasil siap</li>
              </ol>
            </CardContent>
          </Card>

          <Button onClick={() => setConfirm(true)} disabled={!file || !hasEnough || submitting} className="w-full">
            <ShieldAlert className="size-4" /> Kirim untuk Dicek
          </Button>
        </div>
      </div>

      {/* Job history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Riwayat Submission</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingJobs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
              <Loader2 className="animate-spin size-4" /> Memuat...
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Belum ada submission.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Similarity</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm font-medium">{job.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(job.fileSizeBytes)}</p>
                      {job.adminNote && <p className="text-xs text-muted-foreground">Catatan: {job.adminNote}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(job.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell><StatusBadge status={job.status} /></TableCell>
                    <TableCell className="text-right">
                      {job.status === "COMPLETED" && job.similarityScore !== null
                        ? <span className={`font-bold tabular-nums text-sm ${scoreColor(job.similarityScore)}`}>{job.similarityScore}%</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {job.status === "COMPLETED" && (
                        <Button size="sm" variant="outline" onClick={() => api.services.turnitin.downloadResult(job.id)}>
                          <Download className="size-3.5" /> Unduh
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pengiriman</DialogTitle>
            <DialogDescription>Kredit dipotong setelah hasil laporan siap, bukan sekarang.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File</span>
              <span className="max-w-[180px] truncate font-medium">{file?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ukuran</span>
              <span>{file ? formatBytes(file.size) : "-"}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya</span>
              <span className="font-semibold text-primary">Rp {CREDITS_PER_CHECK.toLocaleString("id-ID")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin size-4" /> Mengirim...</> : <><ShieldAlert className="size-4" /> Ya, Kirim</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
