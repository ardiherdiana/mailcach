import { useState, useRef, useEffect } from "react"
import { CheckCircle2, AlertCircle, Download, ExternalLink, Loader2, Info, ShoppingBag, Clock, FileStack } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LowCreditAlert } from "@/components/low-credit-alert"
import { useCredit } from "@/contexts/credit-context"
import { api } from "@/lib/api"

const ACCEPTED_DOMAIN = "elements.envato.com"

function extractAssetTitle(url: string): string {
  try {
    const path = new URL(url).pathname
    return (path.split("/").filter(Boolean).pop() ?? "aset")
      .replace(/[-_]/g, " ").replace(/\.[^.]+$/, "").slice(0, 60)
  } catch { return "aset" }
}

function validateUrl(url: string): boolean {
  try { return new URL(url).hostname.replace(/^www\./, "") === ACCEPTED_DOMAIN }
  catch { return false }
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return "Kadaluarsa"
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(h / 24)
  if (d >= 1) return `${d} hari ${h % 24} jam lagi`
  return `${h} jam lagi`
}

type ActiveStatus = { active: true; filesRemaining: number; filesTotal: number; expiresAt: string } | { active: false }

export default function DownloaderPage(_: { serviceId: "envato" }) {
  const { credits, refresh: refreshCredits } = useCredit()
  const [status, setStatus] = useState<ActiveStatus | null>(null)
  const [packages, setPackages] = useState<{ id: string; tier: string; label: string; days: number; filesPerDay: number; files: number; price: number }[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [buyPkg, setBuyPkg] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState("")

  const [showPackages, setShowPackages] = useState(false)

  const [url, setUrl] = useState("")
  const [urlError, setUrlError] = useState("")
  const [assetTitle, setAssetTitle] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState("")
  const [doneFile, setDoneFile] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadStatus() {
    setLoadingStatus(true)
    try {
      const [s, pkgs] = await Promise.all([api.services.envato.status(), api.services.envato.packages()])
      setStatus(s as ActiveStatus)
      setPackages(pkgs)
    } catch { setStatus({ active: false }) }
    finally { setLoadingStatus(false) }
  }

  useEffect(() => { loadStatus() }, [])

  async function handleBuy() {
    if (!buyPkg) return
    setBuying(true)
    setBuyError("")
    try {
      await api.services.envato.buy(buyPkg)
      await Promise.all([loadStatus(), refreshCredits()])
      setBuyPkg(null)
      setShowPackages(false)
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : "Gagal membeli paket")
    } finally {
      setBuying(false)
    }
  }

  function handleUrlChange(val: string) {
    setUrl(val)
    setUrlError("")
    setDownloadError("")
    setDoneFile("")
    if (val.trim() && !validateUrl(val.trim())) setUrlError(`URL harus dari ${ACCEPTED_DOMAIN}`)
    else if (val.trim()) setAssetTitle(extractAssetTitle(val.trim()))
  }

  async function handleDownload() {
    if (!url.trim() || urlError) return
    setDownloading(true)
    setDownloadError("")
    setDoneFile("")
    try {
      const result = await api.services.envato.download(url.trim())
      // Trigger browser download
      const objectUrl = URL.createObjectURL(result.blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)

      setDoneFile(result.fileName)
      setStatus((prev) => prev?.active
        ? { ...prev, filesRemaining: result.filesRemaining }
        : prev
      )
      setUrl("")
      setAssetTitle("")
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download gagal")
    } finally {
      setDownloading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const selectedPkg = packages.find((p) => p.id === buyPkg)

  if (loadingStatus) {
    return <div className="flex justify-center p-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <LowCreditAlert />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Envato Elements</h2>
          <p className="text-sm text-muted-foreground">Download template, musik, font, dan aset kreatif premium</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {["PSD", "AI", "AE", "MP3", "ZIP"].map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
          ))}
        </div>
      </div>

      {/* Status paket aktif */}
      {status?.active && !showPackages ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Paket aktif</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1"><FileStack className="size-3" /> {status.filesRemaining === 999 ? "Unlimited" : `${status.filesRemaining} / ${status.filesTotal} file tersisa`}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {timeLeft(status.expiresAt)}</span>
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowPackages((v) => !v)}>
                {showPackages ? "Tutup" : "Perpanjang"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Belum punya paket — tampilkan pilihan */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium">Pilih paket untuk mulai download</p>
          </div>

          {(["Lite", "Pro"] as const).map((tier) => {
            const tierPkgs = packages.filter((p) => p.tier === tier)
            const isPopular = tier === "Pro"
            return (
              <div key={tier} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPopular ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {tier}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tier === "Lite" ? "10 file/hari" : "20 file/hari"}
                  </span>
                  {isPopular && <span className="text-xs text-primary font-medium">⚡ Populer</span>}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {tierPkgs.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${isPopular ? "hover:border-primary/60" : "hover:border-muted-foreground/40"}`}
                      onClick={() => setBuyPkg(pkg.id)}
                    >
                      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
                        <div>
                          <p className="font-medium text-sm">{pkg.days === 1 ? "1 Hari" : pkg.days === 7 ? "1 Minggu" : "1 Bulan"}</p>
                          <p className={`font-heading text-2xl font-bold tabular-nums mt-0.5 ${isPopular ? "text-primary" : ""}`}>
                            Rp {pkg.price.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                            {pkg.filesPerDay} file/hari
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                            ±{pkg.files} download
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                            Aktif instan
                          </li>
                        </ul>
                        <Button size="sm" variant={isPopular ? "default" : "outline"} className="w-full">
                          Pilih Paket
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form download — hanya tampil kalau punya paket */}
      {status?.active && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Link Aset</CardTitle>
                <CardDescription>Paste link dari {ACCEPTED_DOMAIN}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={inputRef}
                    type="url"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    placeholder={`https://${ACCEPTED_DOMAIN}/...`}
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    disabled={downloading}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleDownload()}
                  />
                  {urlError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {urlError}
                    </p>
                  )}
                </div>

                {assetTitle && !urlError && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                    <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                    <p className="font-medium truncate">{assetTitle}</p>
                  </div>
                )}

                {doneFile && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm">
                    <Download className="size-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Download berhasil!</p>
                      <p className="text-xs text-muted-foreground">{doneFile}</p>
                    </div>
                  </div>
                )}

                {downloadError && (
                  <Alert className="border-destructive/30 bg-destructive/10">
                    <AlertCircle className="size-4 text-destructive" />
                    <AlertDescription className="text-xs text-destructive">{downloadError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="size-3 mt-0.5 shrink-0" />
                  <span>
                    Paste link langsung ke halaman aset, bukan halaman kategori.{" "}
                    <a href={`https://${ACCEPTED_DOMAIN}`} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">
                      Buka Envato <ExternalLink className="size-2.5" />
                    </a>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Kuota Paket</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File tersisa</span>
                    <span className="font-semibold">
                      {status.filesRemaining === 999 ? "Unlimited" : status.filesRemaining}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kadaluarsa</span>
                    <span className="font-medium text-xs">{timeLeft(status.expiresAt)}</span>
                  </div>
                </div>
                {status.filesRemaining !== 999 && (
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(0, (status.filesRemaining / status.filesTotal) * 100)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleDownload}
              disabled={downloading || !url.trim() || !!urlError}
              className="w-full"
            >
              {downloading ? <><Loader2 className="animate-spin size-4" /> Memproses...</> : <><Download className="size-4" /> Download File</>}
            </Button>
          </div>
        </div>
      )}

      {/* Dialog konfirmasi beli paket */}
      <Dialog open={!!buyPkg} onOpenChange={(o) => { if (!o) { setBuyPkg(null); setBuyError("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Beli Paket {selectedPkg?.label}</DialogTitle>
            <DialogDescription>
              {selectedPkg?.filesPerDay} file/hari · ±{selectedPkg?.files} download · {selectedPkg?.days} hari akses
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Harga</span>
              <span className="font-medium">Rp {selectedPkg?.price.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo kamu</span>
              <span className="font-medium">Rp {credits.toLocaleString("id-ID")}</span>
            </div>
            <div className="border-t pt-1.5 flex justify-between">
              <span className="text-muted-foreground">Sisa saldo</span>
              <span className={`font-semibold ${credits < (selectedPkg?.price ?? 0) ? "text-destructive" : ""}`}>
                Rp {(credits - (selectedPkg?.price ?? 0)).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
          {buyError && <p className="text-xs text-destructive">{buyError}</p>}
          {credits < (selectedPkg?.price ?? 0) && (
            <p className="text-xs text-destructive">
              Saldo tidak cukup.{" "}
              <Link to="/dashboard/topup" className="underline" onClick={() => setBuyPkg(null)}>Top up dulu</Link>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBuyPkg(null); setBuyError("") }}>Batal</Button>
            <Button onClick={handleBuy} disabled={buying || credits < (selectedPkg?.price ?? 0)}>
              {buying ? <><Loader2 className="animate-spin size-4" /> Memproses...</> : "Beli Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
