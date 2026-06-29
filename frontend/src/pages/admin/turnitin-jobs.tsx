import { useState, useEffect, useRef } from "react"
import { Loader2, FileText, Download, Upload, CheckCircle2, Clock, XCircle, Trash2, AlertCircle, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { api, type TurnitinJobAdmin } from "@/lib/api"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function scoreColor(score: number) {
  if (score <= 15) return "text-green-600"
  if (score <= 30) return "text-amber-500"
  return "text-destructive"
}

function StatusBadge({ status }: { status: TurnitinJobAdmin["status"] }) {
  if (status === "PENDING") return <Badge variant="secondary" className="gap-1 whitespace-nowrap"><Clock className="size-3" />Menunggu</Badge>
  if (status === "COMPLETED") return <Badge className="gap-1 whitespace-nowrap bg-green-500/15 text-green-600 hover:bg-green-500/20"><CheckCircle2 className="size-3" />Selesai</Badge>
  return <Badge variant="destructive" className="gap-1 whitespace-nowrap"><XCircle className="size-3" />Gagal</Badge>
}

type CompleteDialogState = { open: true; job: TurnitinJobAdmin } | { open: false }

export default function AdminTurnitinJobsPage() {
  const [jobs, setJobs] = useState<TurnitinJobAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<CompleteDialogState>({ open: false })
  const [resultFile, setResultFile] = useState<File | null>(null)
  const [score, setScore] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try { setJobs(await api.admin.turnitin.jobs()) }
    catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openComplete(job: TurnitinJobAdmin) {
    setDialog({ open: true, job })
    setResultFile(null); setScore(""); setAdminNote(""); setError("")
  }

  async function handleComplete() {
    if (!dialog.open || !resultFile) return
    const parsedScore = score.trim() ? parseInt(score, 10) : null
    if (parsedScore !== null && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
      setError("Score harus antara 0–100"); return
    }
    setCompleting(true); setError("")
    try {
      await api.admin.turnitin.complete(dialog.job.id, resultFile, parsedScore, adminNote.trim() || undefined)
      setDialog({ open: false })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal upload hasil")
    } finally { setCompleting(false) }
  }

  async function handleDelete(job: TurnitinJobAdmin) {
    if (!confirm(`Hapus submission "${job.filename}" dari ${job.user.name}?`)) return
    try { await api.admin.turnitin.delete(job.id); await load() } catch {}
  }

  const pending = jobs.filter((j) => j.status === "PENDING")
  const done = jobs.filter((j) => j.status !== "PENDING")

  function JobActions({ job }: { job: TurnitinJobAdmin }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => api.admin.turnitin.downloadFile(job.id)}>
            <Download className="size-3.5" /> Download
          </DropdownMenuItem>
          {job.status === "PENDING" && (
            <DropdownMenuItem onClick={() => openComplete(job)}>
              <Upload className="size-3.5" /> Upload
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(job)}>
            <Trash2 className="size-3.5" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">Turnitin Jobs</h2>
          <p className="text-sm text-muted-foreground">Kelola submission cek plagiarisme dari pengguna.</p>
        </div>
      </div>

      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="size-4 text-amber-500" />
            Menunggu Review
            {pending.length > 0 && <Badge variant="secondary">{pending.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
              <Loader2 className="animate-spin size-4" /> Memuat...
            </div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Tidak ada submission pending.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm font-medium">{job.filename}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{job.user.name}</p>
                      <p className="text-xs text-muted-foreground">{job.user.email}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatBytes(job.fileSizeBytes)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(job.createdAt)}</TableCell>
                    <TableCell className="text-right"><JobActions job={job} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Done */}
      {done.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Selesai</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Similarity</TableHead>
                  <TableHead>Selesai</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {done.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-[180px]">
                      <p className="truncate text-sm font-medium">{job.filename}</p>
                      {job.adminNote && <p className="text-xs text-muted-foreground truncate">Catatan: {job.adminNote}</p>}
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{job.user.name}</p>
                      <p className="text-xs text-muted-foreground">{job.user.email}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={job.status} /></TableCell>
                    <TableCell className="text-right">
                      {job.similarityScore !== null
                        ? <span className={`font-bold tabular-nums text-sm ${scoreColor(job.similarityScore)}`}>{job.similarityScore}%</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(job.updatedAt)}</TableCell>
                    <TableCell className="text-right"><JobActions job={job} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upload result dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => { if (!o) setDialog({ open: false }) }}>
        <DialogContent className="max-w-md w-full overflow-hidden">
          <DialogHeader className="min-w-0">
            <DialogTitle>Upload Hasil Turnitin</DialogTitle>
            {dialog.open && (
              <DialogDescription className="min-w-0">
                <span className="block truncate text-xs">{dialog.job.filename}</span>
                <span className="text-xs">{dialog.job.user.name} · {dialog.job.user.email}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">File Hasil PDF <span className="text-destructive">*</span></label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-sm transition-colors
                  ${resultFile ? "border-primary/40 bg-primary/5 text-primary" : "border-muted-foreground/25 text-muted-foreground hover:border-primary/50"}`}
              >
                {resultFile
                  ? <><FileText className="size-5" /><span className="text-xs truncate max-w-[200px]">{resultFile.name}</span></>
                  : <><Upload className="size-5" /><span>Klik untuk pilih PDF</span></>}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setResultFile(f) }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Similarity Score <span className="text-muted-foreground font-normal">(%)</span></label>
                <Input type="number" min={0} max={100} placeholder="0–100" value={score}
                  onChange={(e) => setScore(e.target.value)} disabled={completing} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Catatan <span className="text-muted-foreground font-normal">opsional</span></label>
                <Input placeholder="Misal: perlu revisi" value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)} disabled={completing} />
              </div>
            </div>

            {error && (
              <Alert className="border-destructive/30 bg-destructive/10">
                <AlertCircle className="size-4 text-destructive" />
                <AlertDescription className="text-xs text-destructive">{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })} disabled={completing}>Batal</Button>
            <Button onClick={handleComplete} disabled={completing || !resultFile}>
              {completing ? <><Loader2 className="animate-spin size-4" /> Menyimpan...</> : <><CheckCircle2 className="size-4" /> Selesaikan</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
