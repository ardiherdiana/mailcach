import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

const schema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [serverError, setServerError] = useState("")

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    try {
      const { token, user } = await api.auth.register(values.name, values.email, values.password)
      login(token, user)
      navigate("/dashboard")
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registrasi gagal")
    }
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
            <CardDescription>Daftar untuk mulai menggunakan Mailcach</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FieldGroup>
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
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/login" className="text-primary underline">Masuk</Link>
        </p>
      </div>
    </div>
  )
}
