import { useState, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Mic, Play, Loader2, CheckCircle2, AlertCircle, Volume2, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LowCreditAlert } from "@/components/low-credit-alert"
import { useCredit } from "@/contexts/credit-context"
import { api } from "@/lib/api"
import { CHARS_PER_PREVIEW, CREDITS_PER_CHAR } from "@/lib/voices"

type GenerateState = "idle" | "generating" | "done" | "error"

export default function GeneratePage() {
  const { credits, refresh } = useCredit()
  const navigate = useNavigate()

  const [script, setScript] = useState("")
  const [voiceId, setVoiceId] = useState("")
  const [state, setState] = useState<GenerateState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const charCount = script.length
  const creditCost = charCount * CREDITS_PER_CHAR
  const hasEnoughCredits = credits >= creditCost
  const canGenerate = charCount > 0 && !!voiceId.trim() && hasEnoughCredits && state !== "generating"
  const previewText = script.slice(0, CHARS_PER_PREVIEW)

  const estimation = useMemo(() => {
    if (!charCount) return null
    return { needed: creditCost, current: credits, remaining: credits - creditCost, isEnough: credits >= creditCost }
  }, [charCount, creditCost, credits])

  function speakPreview() {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(previewText)
    utt.lang = "id-ID"; utt.rate = 0.95
    utt.onstart = () => setIsSpeaking(true)
    utt.onend = () => setIsSpeaking(false)
    utt.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utt)
  }

  function stopPreview() { window.speechSynthesis.cancel(); setIsSpeaking(false) }

  async function handleGenerate() {
    if (!canGenerate) return
    setState("generating"); setErrorMsg(""); setAudioUrl(null)
    try {
      const result = await api.services.elevenlabs.generate({
        script,
        voiceId: voiceId.trim(),
        voiceLabel: voiceId.trim(),
      })
      setAudioUrl(result.audioUrl)
      await refresh()
      setState("done")
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Generate gagal")
      setState("error")
    }
  }

  function reset() {
    setState("idle"); setScript(""); setVoiceId("")
    setErrorMsg(""); setAudioUrl(null)
  }

  if (state === "done") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <h2 className="font-heading text-xl font-semibold">Voice berhasil dibuat!</h2>
          <p className="text-sm text-muted-foreground">
            {charCount.toLocaleString("id-ID")} karakter · Voice ID <span className="font-mono">{voiceId}</span>
          </p>
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="pt-4">
            {audioUrl ? (
              <>
                <audio ref={audioRef} src={audioUrl} controls className="w-full" />
                <a
                  href={audioUrl}
                  download={`mailcach-voice-${Date.now()}.mp3`}
                  className="mt-3 flex items-center justify-center gap-2 text-sm text-primary underline"
                >
                  Download MP3
                </a>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Volume2 className="size-4" />
                </div>
                <p className="text-sm text-muted-foreground">Audio tidak tersedia (cek API key ElevenLabs)</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={reset}>Buat Lagi</Button>
          <Button onClick={() => navigate("/dashboard/history")}>Lihat Riwayat</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <LowCreditAlert />

      <div>
        <h2 className="font-heading text-lg font-semibold">Buat Voice</h2>
        <p className="text-sm text-muted-foreground">Paste script narasi kamu, masukkan Voice ID, lalu generate.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Script Narasi</CardTitle>
              <CardDescription>Tulis atau paste script yang ingin diubah menjadi suara</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                placeholder="Halo semuanya! Hari ini kita akan membahas..."
                className="min-h-52 resize-y font-mono text-sm leading-relaxed"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                disabled={state === "generating"}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {charCount.toLocaleString("id-ID")} karakter
                  {charCount > 0 && <span className="ml-2 opacity-60">≈ {Math.ceil(charCount / 900)} menit audio</span>}
                </span>
                {charCount > CHARS_PER_PREVIEW && <span>Preview: {CHARS_PER_PREVIEW} char pertama (gratis)</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Voice ID</CardTitle>
              <CardDescription>
                Cari suara di{" "}
                <a
                  href="https://elevenlabs.io/app/voice-library"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary underline"
                >
                  ElevenLabs Voice Library <ExternalLink className="size-3" />
                </a>
                {" "}lalu copy Voice ID-nya
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Input
                placeholder="Contoh: EXAVITQu4vr4xnSDxMaL"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value.trim())}
                className="font-mono"
                disabled={state === "generating"}
              />

              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground">Cara ambil Voice ID:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Buka <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noreferrer" className="text-primary underline">elevenlabs.io/app/voice-library</a></li>
                  <li>Pilih suara yang diinginkan → klik ikon <strong>⋮</strong> (titik tiga)</li>
                  <li>Pilih <strong>Copy Voice ID</strong> dari menu yang muncul</li>
                  <li>Paste di kolom Voice ID di bawah (format: 20 karakter acak)</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Estimasi Kredit</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {estimation ? (
                <>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dibutuhkan</span>
                      <span className="font-medium tabular-nums">Rp {estimation.needed.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo kamu</span>
                      <span className="font-medium tabular-nums">Rp {estimation.current.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sisa setelah generate</span>
                      <span className={`font-semibold tabular-nums ${estimation.isEnough ? "text-foreground" : "text-destructive"}`}>
                        Rp {estimation.remaining.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                  {!estimation.isEnough && (
                    <Alert className="border-destructive/30 bg-destructive/10">
                      <AlertCircle className="size-4 text-destructive" />
                      <AlertDescription className="text-xs text-destructive">
                        Kurang Rp {(estimation.needed - estimation.current).toLocaleString("id-ID")}.{" "}
                        <a href="/dashboard/topup" className="underline">Top up dulu</a>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Ketik script untuk melihat estimasi kredit.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(true)}
              disabled={!script.trim() || state === "generating"}
              className="w-full"
            >
              <Play className="size-4" /> Preview ({CHARS_PER_PREVIEW} char · gratis)
            </Button>

            <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full">
              {state === "generating"
                ? <><Loader2 className="animate-spin" /> Generating...</>
                : <><Mic /> Generate Voice</>}
            </Button>

            {state === "error" && <p className="text-center text-xs text-destructive">{errorMsg}</p>}
          </div>
        </div>
      </div>

      <Dialog open={showPreviewDialog} onOpenChange={(o) => { if (!o) stopPreview(); setShowPreviewDialog(o) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview Script</DialogTitle>
            <DialogDescription>
              {CHARS_PER_PREVIEW} karakter pertama · Browser TTS (bukan ElevenLabs)
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
            &ldquo;{previewText}&rdquo;
            {script.length > CHARS_PER_PREVIEW && <span className="opacity-50"> …(+{script.length - CHARS_PER_PREVIEW} char)</span>}
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <button
              onClick={isSpeaking ? stopPreview : speakPreview}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-80"
            >
              {isSpeaking
                ? <span className="flex gap-0.5">{[...Array(3)].map((_, i) => <span key={i} className="h-3 w-0.5 animate-pulse rounded-full bg-current" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
                : <Play className="size-4" />}
            </button>
            <p className="text-sm">{isSpeaking ? "Sedang diputar..." : "Klik untuk dengarkan"}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { stopPreview(); setShowPreviewDialog(false) }}>Tutup</Button>
            <Button onClick={() => { stopPreview(); setShowPreviewDialog(false); handleGenerate() }} disabled={!canGenerate}>
              Generate Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
