import { useState, useRef } from "react"
import { Loader2, Pencil } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const OTP_LENGTH = 6

export default function ProfilePage() {
  const { user } = useAuth()
  const [open, setOpen] = useState<"nama" | "email" | "password" | null>(null)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">Profil Saya</h2>
        <p className="text-sm text-muted-foreground">Kelola informasi akun kamu.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informasi Akun</CardTitle>
          <CardDescription>Nama, email, dan keamanan akun kamu</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col divide-y">
            <div className="flex items-center justify-between px-6 py-3.5">
              <div>
                <p className="text-xs text-muted-foreground">Nama</p>
                <p className="text-sm font-medium">{user?.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen("nama")}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </div>
            <div className="flex items-center justify-between px-6 py-3.5">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen("email")}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </div>
            <div className="flex items-center justify-between px-6 py-3.5">
              <div>
                <p className="text-xs text-muted-foreground">Password</p>
                <p className="text-sm font-medium">{user?.hasPassword ? "••••••••" : "Belum diset"}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen("password")}>
                <Pencil className="size-3.5" />
                {user?.hasPassword ? "Ganti" : "Buat"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <NamaDialog open={open === "nama"} onClose={() => setOpen(null)} />
      <EmailDialog open={open === "email"} onClose={() => setOpen(null)} />
      <PasswordDialog open={open === "password"} onClose={() => setOpen(null)} />
    </div>
  )
}

// ── Dialog Nama ───────────────────────────────────────────────────────────────

function NamaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (name.trim().length < 2) { setError("Nama minimal 2 karakter"); return }
    setLoading(true)
    try {
      const updated = await api.me.updateProfile(name.trim())
      setUser({ ...user!, ...updated })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganti Nama</DialogTitle>
          <DialogDescription>Nama yang ditampilkan di akun kamu.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Nama Lengkap</FieldLabel>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setError("") }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave} disabled={loading || name.trim() === user?.name}>
              {loading && <Loader2 className="animate-spin" />} Simpan
            </Button>
          </div>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog Email ──────────────────────────────────────────────────────────────

function EmailDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useAuth()
  const [step, setStep] = useState<"form" | "otp">("form")
  const [newEmail, setNewEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(""))
  const [otpError, setOtpError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function reset() { setStep("form"); setNewEmail(""); setError(""); setOtpValues(Array(OTP_LENGTH).fill("")); setOtpError("") }

  async function handleSend() {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { setError("Email tidak valid"); return }
    setLoading(true)
    try { await api.me.changeEmailSend(newEmail.trim()); setStep("otp"); setOtpValues(Array(OTP_LENGTH).fill("")) }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal mengirim OTP") }
    finally { setLoading(false) }
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return
    const next = [...otpValues]; next[i] = val.slice(-1); setOtpValues(next); setOtpError("")
    if (val && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus()
  }
  function handleOtpKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpValues[i] && i > 0) refs.current[i - 1]?.focus()
  }
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    const next = Array(OTP_LENGTH).fill(""); text.split("").forEach((c, i) => { next[i] = c })
    setOtpValues(next); refs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleVerify() {
    const code = otpValues.join("")
    if (code.length < OTP_LENGTH) { setOtpError("Masukkan 6 digit kode OTP"); return }
    setVerifying(true)
    try { const u = await api.me.changeEmailVerify(newEmail.trim(), code); setUser({ ...user!, ...u }); reset(); onClose() }
    catch (err) { setOtpError(err instanceof Error ? err.message : "Kode OTP salah") }
    finally { setVerifying(false) }
  }

  async function handleResend() {
    setResending(true); setOtpValues(Array(OTP_LENGTH).fill("")); setOtpError("")
    try { await api.me.changeEmailSend(newEmail.trim()) } catch {}
    setResending(false); refs.current[0]?.focus()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganti Email</DialogTitle>
          <DialogDescription>
            {step === "form" ? `Email saat ini: ${user?.email}` : `Kode OTP dikirim ke ${newEmail}`}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <FieldGroup>
            <Field>
              <FieldLabel>Email Baru</FieldLabel>
              <Input type="email" value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="email-baru@contoh.com" autoFocus />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handleSend} disabled={loading || !newEmail.trim()}>
                {loading && <Loader2 className="animate-spin" />} Kirim Kode
              </Button>
            </div>
          </FieldGroup>
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel className="block">Kode OTP</FieldLabel>
              <div className="flex gap-2 mt-1" onPaste={handlePaste}>
                {otpValues.map((val, i) => (
                  <input key={i} ref={(el) => { refs.current[i] = el }} type="text" inputMode="numeric"
                    maxLength={1} value={val} onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)} autoFocus={i === 0}
                    className="size-11 rounded-md border border-input bg-transparent text-center text-lg font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                ))}
              </div>
              {otpError && <FieldError>{otpError}</FieldError>}
              <FieldDescription>
                Tidak dapat kode?{" "}
                <button type="button" onClick={handleResend} disabled={resending}
                  className="text-primary underline underline-offset-4 hover:text-primary/80 disabled:opacity-50">
                  {resending ? "Mengirim..." : "Kirim ulang"}
                </button>
              </FieldDescription>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setStep("form"); setOtpValues(Array(OTP_LENGTH).fill("")) }}>Kembali</Button>
              <Button onClick={handleVerify} disabled={verifying}>
                {verifying && <Loader2 className="animate-spin" />} Verifikasi & Simpan
              </Button>
            </div>
          </FieldGroup>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog Password ───────────────────────────────────────────────────────────

type PassStep = "change" | "forgot-email" | "forgot-otp" | "forgot-reset"

function PasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useAuth()
  const isGoogleOnly = user?.isGoogleLinked && !user?.hasPassword

  const [step, setStep] = useState<PassStep>("change")

  // Change password
  const [currentPass, setCurrentPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [changeLoading, setChangeLoading] = useState(false)
  const [changeError, setChangeError] = useState("")

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState(user?.email ?? "")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState("")
  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(""))
  const [otpError, setOtpError] = useState("")
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpResending, setOtpResending] = useState(false)
  const [verifiedOtp, setVerifiedOtp] = useState("")
  const [resetPass, setResetPass] = useState("")
  const [resetConfirm, setResetConfirm] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState("")
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function handleClose() {
    setStep("change"); setCurrentPass(""); setNewPass(""); setConfirmPass(""); setChangeError("")
    setForgotEmail(user?.email ?? ""); setForgotError(""); setOtpValues(Array(OTP_LENGTH).fill("")); setOtpError("")
    setVerifiedOtp(""); setResetPass(""); setResetConfirm(""); setResetError("")
    onClose()
  }

  async function handleChangePassword() {
    setChangeError("")
    if (newPass.length < 6) { setChangeError("Password baru minimal 6 karakter"); return }
    if (newPass !== confirmPass) { setChangeError("Konfirmasi password tidak cocok"); return }
    if (!isGoogleOnly && !currentPass) { setChangeError("Password saat ini wajib diisi"); return }
    setChangeLoading(true)
    try {
      await api.me.changePassword(newPass, isGoogleOnly ? undefined : currentPass)
      setUser({ ...user!, hasPassword: true })
      handleClose()
    } catch (err) { setChangeError(err instanceof Error ? err.message : "Gagal mengubah password") }
    finally { setChangeLoading(false) }
  }

  async function handleForgotSend() {
    setForgotError("")
    setForgotLoading(true)
    try { await api.auth.forgotPassword(forgotEmail); setStep("forgot-otp"); setOtpValues(Array(OTP_LENGTH).fill("")) }
    catch (err) { setForgotError(err instanceof Error ? err.message : "Gagal mengirim OTP") }
    finally { setForgotLoading(false) }
  }

  function handleOtpChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return
    const next = [...otpValues]; next[i] = val.slice(-1); setOtpValues(next); setOtpError("")
    if (val && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus()
  }
  function handleOtpKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpValues[i] && i > 0) refs.current[i - 1]?.focus()
  }
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    const next = Array(OTP_LENGTH).fill(""); text.split("").forEach((c, i) => { next[i] = c })
    setOtpValues(next); refs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleOtpVerify() {
    const code = otpValues.join("")
    if (code.length < OTP_LENGTH) { setOtpError("Masukkan 6 digit kode OTP"); return }
    setOtpVerifying(true)
    // Simpan OTP untuk dipakai saat reset — verifikasi dilakukan di endpoint reset-password
    setVerifiedOtp(code)
    setOtpVerifying(false)
    setStep("forgot-reset")
  }

  async function handleResendOtp() {
    setOtpResending(true); setOtpValues(Array(OTP_LENGTH).fill("")); setOtpError("")
    try { await api.auth.forgotPassword(forgotEmail) } catch {}
    setOtpResending(false); refs.current[0]?.focus()
  }

  async function handleReset() {
    setResetError("")
    if (resetPass.length < 6) { setResetError("Password minimal 6 karakter"); return }
    if (resetPass !== resetConfirm) { setResetError("Konfirmasi password tidak cocok"); return }
    setResetLoading(true)
    try {
      await api.auth.resetPassword(forgotEmail, verifiedOtp, resetPass)
      setUser({ ...user!, hasPassword: true })
      handleClose()
    } catch (err) { setResetError(err instanceof Error ? err.message : "Gagal reset password. Ulangi dari awal.") }
    finally { setResetLoading(false) }
  }

  const titles: Record<PassStep, { title: string; desc: string }> = {
    "change": { title: isGoogleOnly ? "Buat Password" : "Ganti Password", desc: isGoogleOnly ? "Buat password untuk bisa login dengan email & password juga." : "Masukkan password lama lalu buat yang baru." },
    "forgot-email": { title: "Lupa Password", desc: "Masukkan email akun kamu untuk menerima kode OTP." },
    "forgot-otp": { title: "Verifikasi OTP", desc: `Kode OTP dikirim ke ${forgotEmail}` },
    "forgot-reset": { title: "Password Baru", desc: "Masukkan password baru untuk akun kamu." },
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[step].title}</DialogTitle>
          <DialogDescription>{titles[step].desc}</DialogDescription>
        </DialogHeader>

        {step === "change" && (
          <FieldGroup>
            {!isGoogleOnly && (
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Password Saat Ini</FieldLabel>
                  <button type="button" onClick={() => setStep("forgot-email")}
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary">
                    Lupa password?
                  </button>
                </div>
                <Input type="password" value={currentPass} onChange={(e) => { setCurrentPass(e.target.value); setChangeError("") }} placeholder="••••••" autoFocus />
              </Field>
            )}
            <Field>
              <FieldLabel>Password Baru</FieldLabel>
              <Input type="password" value={newPass} onChange={(e) => { setNewPass(e.target.value); setChangeError("") }} placeholder="••••••" autoFocus={!!isGoogleOnly} />
            </Field>
            <Field>
              <FieldLabel>Konfirmasi Password</FieldLabel>
              <Input type="password" value={confirmPass} onChange={(e) => { setConfirmPass(e.target.value); setChangeError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()} placeholder="••••••" />
              {changeError && <FieldError>{changeError}</FieldError>}
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Batal</Button>
              <Button onClick={handleChangePassword} disabled={changeLoading}>
                {changeLoading && <Loader2 className="animate-spin" />}
                {isGoogleOnly ? "Buat Password" : "Simpan"}
              </Button>
            </div>
          </FieldGroup>
        )}

        {step === "forgot-email" && (
          <FieldGroup>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" value={forgotEmail} onChange={(e) => { setForgotEmail(e.target.value); setForgotError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleForgotSend()} autoFocus />
              {forgotError && <FieldError>{forgotError}</FieldError>}
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("change")}>Kembali</Button>
              <Button onClick={handleForgotSend} disabled={forgotLoading}>
                {forgotLoading && <Loader2 className="animate-spin" />} Kirim Kode OTP
              </Button>
            </div>
          </FieldGroup>
        )}

        {step === "forgot-otp" && (
          <FieldGroup>
            <Field>
              <FieldLabel className="block">Kode OTP</FieldLabel>
              <div className="flex gap-2 mt-1" onPaste={handlePaste}>
                {otpValues.map((val, i) => (
                  <input key={i} ref={(el) => { refs.current[i] = el }} type="text" inputMode="numeric"
                    maxLength={1} value={val} onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)} autoFocus={i === 0}
                    className="size-11 rounded-md border border-input bg-transparent text-center text-lg font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                ))}
              </div>
              {otpError && <FieldError>{otpError}</FieldError>}
              <FieldDescription>
                Tidak dapat kode?{" "}
                <button type="button" onClick={handleResendOtp} disabled={otpResending}
                  className="text-primary underline underline-offset-4 hover:text-primary/80 disabled:opacity-50">
                  {otpResending ? "Mengirim..." : "Kirim ulang"}
                </button>
              </FieldDescription>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setStep("forgot-email"); setOtpValues(Array(OTP_LENGTH).fill("")) }}>Kembali</Button>
              <Button onClick={handleOtpVerify} disabled={otpVerifying}>
                {otpVerifying && <Loader2 className="animate-spin" />} Verifikasi
              </Button>
            </div>
          </FieldGroup>
        )}

        {step === "forgot-reset" && (
          <FieldGroup>
            <Field>
              <FieldLabel>Password Baru</FieldLabel>
              <Input type="password" value={resetPass} onChange={(e) => { setResetPass(e.target.value); setResetError("") }} placeholder="••••••" autoFocus />
            </Field>
            <Field>
              <FieldLabel>Konfirmasi Password</FieldLabel>
              <Input type="password" value={resetConfirm} onChange={(e) => { setResetConfirm(e.target.value); setResetError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleReset()} placeholder="••••••" />
              {resetError && <FieldError>{resetError}</FieldError>}
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Batal</Button>
              <Button onClick={handleReset} disabled={resetLoading}>
                {resetLoading && <Loader2 className="animate-spin" />} Simpan Password
              </Button>
            </div>
          </FieldGroup>
        )}
      </DialogContent>
    </Dialog>
  )
}
