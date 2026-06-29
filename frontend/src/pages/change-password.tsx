import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Loader2, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const isGoogleOnly = user?.isGoogleLinked && !user?.hasPassword

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    setError("")
    if (newPassword.length < 6) { setError("Password baru minimal 6 karakter"); return }
    if (newPassword !== confirmPassword) { setError("Konfirmasi password tidak cocok"); return }
    if (!isGoogleOnly && !currentPassword) { setError("Password saat ini wajib diisi"); return }
    setLoading(true)
    try {
      await api.me.changePassword(newPassword, isGoogleOnly ? undefined : currentPassword)
      setUser({ ...user!, hasPassword: true })
      navigate("/dashboard/profile")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => navigate("/dashboard/profile")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="font-heading text-lg font-semibold">
            {isGoogleOnly ? "Buat Password" : "Ganti Password"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isGoogleOnly
              ? "Buat password untuk bisa login dengan email & password juga."
              : "Perbarui password akun kamu."}
          </p>
        </div>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">{isGoogleOnly ? "Password Baru" : "Ubah Password"}</CardTitle>
          <CardDescription>
            {isGoogleOnly
              ? "Password minimal 6 karakter."
              : "Masukkan password lama lalu buat yang baru."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {!isGoogleOnly && (
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Password Saat Ini</FieldLabel>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
                  >
                    Lupa password?
                  </Link>
                </div>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setError("") }}
                  placeholder="••••••"
                  autoFocus
                />
              </Field>
            )}
            <Field>
              <FieldLabel>Password Baru</FieldLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError("") }}
                placeholder="••••••"
                autoFocus={!!isGoogleOnly}
              />
            </Field>
            <Field>
              <FieldLabel>Konfirmasi Password</FieldLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="••••••"
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field>
              <Button className="w-full" onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {isGoogleOnly ? "Buat Password" : "Simpan Password"}
              </Button>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}
