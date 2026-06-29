import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const OTP_LENGTH = 6

export default function ChangeEmailPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const [step, setStep] = useState<"form" | "otp">("form")
  const [newEmail, setNewEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(""))
  const [otpError, setOtpError] = useState("")
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpResending, setOtpResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  async function handleSend() {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setError("Masukkan email yang valid"); return
    }
    setLoading(true)
    try {
      await api.me.changeEmailSend(newEmail.trim())
      setStep("otp")
      setOtpValues(Array(OTP_LENGTH).fill(""))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim OTP")
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(i: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otpValues]
    next[i] = value.slice(-1)
    setOtpValues(next)
    setOtpError("")
    if (value && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus()
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpValues[i] && i > 0) inputRefs.current[i - 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    const next = Array(OTP_LENGTH).fill("")
    text.split("").forEach((c, idx) => { next[idx] = c })
    setOtpValues(next)
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleVerify() {
    const code = otpValues.join("")
    if (code.length < OTP_LENGTH) { setOtpError("Masukkan 6 digit kode OTP"); return }
    setOtpVerifying(true)
    try {
      const updated = await api.me.changeEmailVerify(newEmail.trim(), code)
      setUser({ ...user!, ...updated })
      navigate("/dashboard/profile")
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Kode OTP salah")
    } finally {
      setOtpVerifying(false)
    }
  }

  async function handleResend() {
    setOtpResending(true)
    setOtpValues(Array(OTP_LENGTH).fill(""))
    setOtpError("")
    try { await api.me.changeEmailSend(newEmail.trim()) } catch {}
    setOtpResending(false)
    inputRefs.current[0]?.focus()
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => navigate("/dashboard/profile")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="font-heading text-lg font-semibold">Ganti Email</h2>
          <p className="text-sm text-muted-foreground">Email saat ini: <strong>{user?.email}</strong></p>
        </div>
      </div>

      <Card className="max-w-sm">
        {step === "form" ? (
          <>
            <CardHeader>
              <CardTitle className="text-base">Email Baru</CardTitle>
              <CardDescription>Masukkan email baru kamu. Kami akan kirim kode verifikasi.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Email Baru</FieldLabel>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setError("") }}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="email-baru@contoh.com"
                    autoFocus
                  />
                  {error && <FieldError>{error}</FieldError>}
                </Field>
                <Field>
                  <Button className="w-full" onClick={handleSend} disabled={loading || !newEmail.trim()}>
                    {loading && <Loader2 className="animate-spin" />}
                    Kirim Kode Verifikasi
                  </Button>
                </Field>
              </FieldGroup>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-base">Verifikasi Email</CardTitle>
              <CardDescription>
                Kode OTP dikirim ke <strong>{newEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel className="block">Masukkan kode 6 digit</FieldLabel>
                  <div className="flex gap-2 mt-2" onPaste={handleOtpPaste}>
                    {otpValues.map((val, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="size-11 rounded-md border border-input bg-transparent text-center text-lg font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  {otpError && <FieldError>{otpError}</FieldError>}
                  <FieldDescription>
                    Tidak dapat kode?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={otpResending}
                      className="text-primary underline underline-offset-4 hover:text-primary/80 disabled:opacity-50"
                    >
                      {otpResending ? "Mengirim..." : "Kirim ulang"}
                    </button>
                  </FieldDescription>
                </Field>
                <Field>
                  <Button className="w-full" onClick={handleVerify} disabled={otpVerifying}>
                    {otpVerifying && <Loader2 className="animate-spin" />}
                    Verifikasi & Simpan
                  </Button>
                </Field>
                <Field>
                  <Button variant="ghost" className="w-full" onClick={() => { setStep("form"); setOtpValues(Array(OTP_LENGTH).fill("")) }}>
                    Ganti email
                  </Button>
                </Field>
              </FieldGroup>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
