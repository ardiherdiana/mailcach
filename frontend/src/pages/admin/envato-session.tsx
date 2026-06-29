import { useState, useEffect } from "react"
import { CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"

type SessionStatus = { active: boolean; updatedAt?: string; note?: string; cookiePreview?: string }

export default function AdminEnvatoSessionPage() {
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [cookies, setCookies] = useState("")
  const [note, setNote] = useState("")

  async function load() {
    setLoading(true)
    try { setStatus(await api.admin.envatoSession.get()) }
    catch { setStatus({ active: false }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!cookies.trim()) return
    setSaving(true); setError(""); setSuccess("")
    try {
      await api.admin.envatoSession.set({ cookies: cookies.trim(), note: note.trim() || undefined })
      setSuccess("Session berhasil disimpan!")
      setCookies(""); setNote("")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan session")
    } finally { setSaving(false) }
  }

  async function handleClear() {
    if (!confirm("Hapus session Envato? Download tidak akan bisa diproses sampai session baru diset.")) return
    try {
      await api.admin.envatoSession.clear()
      await load()
    } catch {}
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">Envato Session</h2>
        <p className="text-sm text-muted-foreground">Kelola cookies sesi Envato Elements untuk proses download otomatis.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Status Session</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin size-4" /> Memuat...</div>
          ) : status?.active ? (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-green-500/15">
                  <CheckCircle2 className="size-4 text-green-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Session aktif</p>
                    <Badge variant="secondary" className="text-xs">OK</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{status.cookiePreview}</p>
                  {status.note && <p className="text-xs text-muted-foreground mt-0.5">Catatan: {status.note}</p>}
                  {status.updatedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Update: {new Date(status.updatedAt).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
              </div>
              <Button size="sm" variant="destructive" onClick={handleClear}>
                <Trash2 className="size-3.5" /> Hapus
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <AlertCircle className="size-4 text-amber-500 shrink-0" />
              Session belum diset — download Envato tidak akan berfungsi.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="size-4" /> {status?.active ? "Perbarui Session" : "Set Session Baru"}
          </CardTitle>
          <CardDescription>Cookies perlu diperbarui setiap ~30 hari atau jika session expired</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Cookie String <span className="text-destructive">*</span></label>
            <Textarea
              placeholder="_envato_session=abc123; user_auth_token=xyz789; ..."
              className="min-h-28 font-mono text-xs resize-y"
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Paste isi dari header Cookie (format: key=value; key2=value2; ...)</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Catatan (opsional)</label>
            <Input
              placeholder="Contoh: Akun ardih@gmail.com, update 25 Jun 2026"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
            />
          </div>

          {error && (
            <Alert className="border-destructive/30 bg-destructive/10">
              <AlertCircle className="size-4 text-destructive" />
              <AlertDescription className="text-xs text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="size-4 text-green-500" />
              <AlertDescription className="text-xs text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSave} disabled={saving || !cookies.trim()} className="self-start">
            {saving ? <><Loader2 className="animate-spin size-4" /> Menyimpan...</> : "Simpan Session"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
