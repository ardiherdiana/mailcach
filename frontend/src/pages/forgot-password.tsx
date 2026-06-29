import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Loader2, Mail, KeyRound } from "lucide-react"
import { MailcachLogo } from "@/components/logo"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"

const OTP_LENGTH = 6

type Step = "email" | "otp" | "reset"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [sending, setSending] = useState(false)

  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(""))
  const [otpError, setOtpError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [verifiedOtp, setVerifiedOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetError, setResetError] = useState("")
  const [resetting, setResetting] = useState(false)

  async function handleSendOtp() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Masukkan email yang valid")
      return
    }
    setSending(true)
    try {
      await api.auth.forgotPassword(email.trim())
      setStep("otp")
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Gagal mengirim email. Coba lagi.")
    } finally {
      setSending(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otpValues]
    next[index] = value.slice(-1)
    setOtpValues(next)
    setOtpError("")
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    const next = Array(OTP_LENGTH).fill("")
    text.split("").forEach((c, i) => { next[i] = c })
    setOtpValues(next)
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
  }

  async function verifyOtp() {
    const code = otpValues.join("")
    if (code.length < OTP_LENGTH) { setOtpError("Masukkan 6 digit kode OTP"); return }
    setVerifying(true)
    try {
      // Simpan OTP di state untuk dipakai saat reset password
      setVerifiedOtp(code)
      setVerifying(false)
      setStep("reset")
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Kode OTP salah. Coba lagi.")
      setVerifying(false)
    }
  }

  async function resendOtp() {
    setResending(true)
    setOtpValues(Array(OTP_LENGTH).fill(""))
    setOtpError("")
    try {
      await api.auth.forgotPassword(email)
    } catch {}
    setResending(false)
    inputRefs.current[0]?.focus()
  }

  async function handleReset() {
    if (newPassword.length < 6) { setResetError("Password minimal 6 karakter"); return }
    if (newPassword !== confirmPassword) { setResetError("Password tidak cocok"); return }
    setResetting(true)
    try {
      await api.auth.resetPassword(email, verifiedOtp, newPassword)
      navigate("/login")
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Gagal reset password. Coba ulangi dari awal.")
      setResetting(false)
    }
  }

  if (step === "otp") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Logo />
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="size-6" />
              </div>
              <CardTitle className="text-xl">Cek Email Kamu</CardTitle>
              <CardDescription>
                Kode OTP dikirim ke <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel className="text-center block">Masukkan kode 6 digit</FieldLabel>
                  <div className="flex justify-center gap-2 mt-2" onPaste={handleOtpPaste}>
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
                  {otpError && <FieldError className="text-center">{otpError}</FieldError>}
                </Field>

                <Button className="w-full" onClick={verifyOtp} disabled={verifying}>
                  {verifying ? <><Loader2 className="animate-spin" /> Memverifikasi...</> : "Verifikasi"}
                </Button>

                <FieldDescription className="text-center">
                  Tidak dapat kode?{" "}
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={resending}
                    className="text-primary underline underline-offset-4 hover:text-primary/80 disabled:opacity-50"
                  >
                    {resending ? "Mengirim..." : "Kirim ulang"}
                  </button>
                </FieldDescription>

                <FieldDescription className="text-center">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setOtpValues(Array(OTP_LENGTH).fill("")); setOtpError("") }}
                    className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Ganti email
                  </button>
                </FieldDescription>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === "reset") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Logo />
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="size-6" />
              </div>
              <CardTitle className="text-xl">Buat Password Baru</CardTitle>
              <CardDescription>Masukkan password baru untuk akun kamu</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Password Baru</FieldLabel>
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setResetError("") }}
                  />
                </Field>
                <Field>
                  <FieldLabel>Konfirmasi Password</FieldLabel>
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setResetError("") }}
                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  />
                  {resetError && <FieldError>{resetError}</FieldError>}
                </Field>

                <Button className="w-full" onClick={handleReset} disabled={resetting}>
                  {resetting ? <><Loader2 className="animate-spin" /> Menyimpan...</> : "Simpan Password"}
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Logo />
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Lupa Password?</CardTitle>
            <CardDescription>
              Masukkan email kamu dan kami akan kirim kode OTP untuk reset password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  autoFocus
                />
                {emailError && <FieldError>{emailError}</FieldError>}
              </Field>

              <Button className="w-full" onClick={handleSendOtp} disabled={sending}>
                {sending ? <><Loader2 className="animate-spin" /> Mengirim...</> : "Kirim Kode OTP"}
              </Button>

              <FieldDescription className="text-center">
                Ingat password?{" "}
                <Link to="/login" className="underline underline-offset-4 hover:text-primary">
                  Masuk
                </Link>
              </FieldDescription>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2 self-center font-medium">
      <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <MailcachLogo className="size-4" />
      </div>
      Mailcach
    </div>
  )
}
