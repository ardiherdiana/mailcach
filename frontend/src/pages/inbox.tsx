import { useState, useRef } from "react"
import { Mail, Inbox, Loader2, RefreshCw, ChevronLeft, AlertCircle, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LowCreditAlert } from "@/components/low-credit-alert"
import { useCredit } from "@/contexts/credit-context"
import { api } from "@/lib/api"

const COST = 10

type InboxEmail = {
  id: string
  subject: string
  sender: string
  recipient: string
  body: string
  body_html: string
  timestamp: number
}

type DetailEmail = InboxEmail & { hasHtml: boolean }

function formatTime(ts: number) {
  const d = new Date(ts * 1000)
  return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" })
}

function EmailDetail({ email, onBack }: { email: DetailEmail; onBack: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 w-fit">
        <ChevronLeft className="size-4" /> Kembali ke inbox
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base leading-snug">{email.subject || "(Tanpa subjek)"}</CardTitle>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>Dari: <span className="text-foreground">{email.sender}</span></span>
            <span>Ke: <span className="text-foreground">{email.recipient}</span></span>
            <span className="flex items-center gap-1"><Clock className="size-3" />{formatTime(email.timestamp)}</span>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {email.hasHtml && email.body_html ? (
            <iframe
              ref={iframeRef}
              srcDoc={email.body_html}
              sandbox="allow-same-origin"
              className="w-full rounded border bg-white"
              style={{ minHeight: 400 }}
              onLoad={() => {
                const doc = iframeRef.current?.contentDocument
                if (doc) {
                  iframeRef.current!.style.height = doc.body.scrollHeight + 32 + "px"
                }
              }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {email.body || "(Email kosong)"}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InboxPage() {
  const { credits, refresh } = useCredit()

  const [prefix, setPrefix] = useState("")
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState("")
  const [emails, setEmails] = useState<InboxEmail[] | null>(null)
  const [currentPrefix, setCurrentPrefix] = useState("")
  const [currentDomain, setCurrentDomain] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<DetailEmail | null>(null)

  const cleanPrefix = prefix.trim().toLowerCase().replace(/@.*$/, "")
  const canSearch = cleanPrefix.length > 0 && !loading && credits >= COST

  async function handleSearch() {
    if (!canSearch) return
    setLoading(true)
    setError("")
    setEmails(null)
    setSelectedEmail(null)
    try {
      const result = await api.services.inbox.search(cleanPrefix)
      setEmails(result.emails)
      setCurrentPrefix(result.prefix)
      setCurrentDomain(result.domain)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pencarian gagal")
    } finally {
      setLoading(false)
    }
  }

  async function handleSelect(email: InboxEmail) {
    setDetailLoading(true)
    try {
      const result = await api.services.inbox.detail(email.id)
      if (result.success && result.email) {
        setSelectedEmail(result.email)
      } else {
        setSelectedEmail({ ...email, hasHtml: !!email.body_html })
      }
    } catch {
      setSelectedEmail({ ...email, hasHtml: !!email.body_html })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <LowCreditAlert />

      <div>
        <h2 className="font-heading text-lg font-semibold">Email Inbox</h2>
        <p className="text-sm text-muted-foreground">Cek email masuk ke alamat @mailcach.com. Rp {COST} per pencarian.</p>
      </div>

      {selectedEmail ? (
        <EmailDetail email={selectedEmail} onBack={() => setSelectedEmail(null)} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Search box */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Masukkan Prefix Email</CardTitle>
                <CardDescription>
                  Email yang masuk ke <strong>prefix@mailcach.com</strong> akan ditampilkan di sini
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="contoh: pesanan2024"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      disabled={loading}
                      className="pr-32"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                      @mailcach.com
                    </span>
                  </div>
                  <Button onClick={handleSearch} disabled={!canSearch}>
                    {loading ? <Loader2 className="animate-spin" /> : <Mail />}
                    {loading ? "Memuat..." : "Cek Inbox"}
                  </Button>
                </div>

                {error && (
                  <Alert className="border-destructive/30 bg-destructive/10">
                    <AlertCircle className="size-4 text-destructive" />
                    <AlertDescription className="text-xs text-destructive">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Tutorial */}
                <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-medium text-foreground">Cara pakai:</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>Saat mendaftar di situs lain, gunakan email <strong>prefix@mailcach.com</strong> (contoh: <span className="font-mono">akusaya99@mailcach.com</span>)</li>
                    <li>Kembali ke sini, masukkan prefix yang sama (contoh: <span className="font-mono">akusaya99</span>)</li>
                    <li>Klik <strong>Cek Inbox</strong> — email verifikasi akan muncul</li>
                    <li>Setiap pencarian dikenakan biaya <strong>Rp {COST}</strong></li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Email list */}
            {emails !== null && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Inbox: <span className="font-mono text-primary">{currentPrefix}@{currentDomain}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{emails.length} email</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={handleSearch}
                        disabled={loading}
                        title="Refresh"
                      >
                        <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {emails.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                      <Inbox className="size-8 opacity-30" />
                      <p className="text-sm">Belum ada email masuk</p>
                      <p className="text-xs">Pastikan kamu mengirim email ke <span className="font-mono">{currentPrefix}@{currentDomain}</span></p>
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {emails.map((email) => (
                        <li key={email.id}>
                          <button
                            onClick={() => handleSelect(email)}
                            disabled={detailLoading}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-sm font-medium">
                                  {email.subject || "(Tanpa subjek)"}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">{email.sender}</span>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">{formatTime(email.timestamp)}</span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Panel kanan */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Biaya Pencarian</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Biaya per cek</span>
                  <span className="font-medium">Rp {COST.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo kamu</span>
                  <span className="font-medium tabular-nums">Rp {credits.toLocaleString("id-ID")}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa setelah cek</span>
                  <span className={`font-semibold tabular-nums ${credits >= COST ? "text-foreground" : "text-destructive"}`}>
                    Rp {(credits - COST).toLocaleString("id-ID")}
                  </span>
                </div>
                {credits < COST && (
                  <Alert className="border-destructive/30 bg-destructive/10">
                    <AlertCircle className="size-4 text-destructive" />
                    <AlertDescription className="text-xs text-destructive">
                      Saldo tidak cukup.{" "}
                      <a href="/dashboard/topup" className="underline">Top up dulu</a>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
