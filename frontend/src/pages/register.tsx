import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Mail } from "lucide-react"
import { useGoogleLogin } from "@react-oauth/google"
import { MailcachLogo } from "@/components/logo"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

const schema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})
type FormValues = z.infer<typeof schema>

const OTP_LENGTH = 6

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState<"form" | "otp">("form")
  const [serverError, setServerError] = useState("")
  const [googleLoading, setGoogleLoading] = useState(false)

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      setServerError("")
      try {
        const { token, user } = await api.auth.google(tokenResponse.access_token)
        login(token, user)
        navigate("/dashboard")
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Login Google gagal")
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => setServerError("Login Google dibatalkan atau gagal"),
  })
  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(""))
  const [otpError, setOtpError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [pendingData, setPendingData] = useState<{ token: string; user: Parameters<typeof login>[1] } | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    try {
      const result = await api.auth.register(values.name, values.email, values.password)
      setPendingData(result)
      await api.auth.sendRegisterOtp(values.email, values.name)
      setStep("otp")
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registrasi gagal")
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
      await api.auth.verifyRegisterOtp(getValues("email"), code)
      if (pendingData) login(pendingData.token, pendingData.user)
      navigate("/dashboard")
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
      await api.auth.sendRegisterOtp(getValues("email"), getValues("name"))
    } catch {}
    setResending(false)
    inputRefs.current[0]?.focus()
  }

  if (step === "otp") {
    const email = getValues("email")
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2 self-center font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MailcachLogo className="size-4" />
            </div>
            Mailcach
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="size-6" />
              </div>
              <CardTitle className="text-xl">Verifikasi Email</CardTitle>
              <CardDescription>
                Kode OTP telah dikirim ke <strong>{email}</strong>
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
                    onClick={() => { setStep("form"); setOtpValues(Array(OTP_LENGTH).fill("")); setOtpError("") }}
                    className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Kembali ubah data
                  </button>
                </FieldDescription>
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
        <Link to="/login" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="size-4 fill-current">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          Mailcach
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Buat akun baru</CardTitle>
            <CardDescription>Akses layanan AI & aset kreatif premium dengan sistem kredit</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FieldGroup>
                <Field>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={() => loginWithGoogle()}
                    disabled={googleLoading || isSubmitting}
                  >
                    {googleLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    {googleLoading ? "Memproses..." : "Daftar dengan Google"}
                  </Button>
                </Field>

                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                  Atau daftar dengan email
                </FieldSeparator>

                <Field>
                  <FieldLabel>Nama Lengkap</FieldLabel>
                  <Input placeholder="John Doe" {...register("name")} />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" placeholder="kamu@email.com" {...register("email")} />
                  {errors.email && <FieldError>{errors.email.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <Input type="password" placeholder="••••••" {...register("password")} />
                  {errors.password && <FieldError>{errors.password.message}</FieldError>}
                </Field>

                {serverError && <p className="text-sm text-destructive">{serverError}</p>}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="animate-spin" /> Mendaftar...</> : "Daftar"}
                </Button>

                <FieldDescription className="text-center">
                  Sudah punya akun?{" "}
                  <Link to="/login" className="underline underline-offset-4 hover:text-primary">
                    Masuk
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
