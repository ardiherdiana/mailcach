import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError("")
    try {
      const { token, user } = await api.auth.login(values.email, values.password)
      login(token, user)
      navigate("/dashboard")
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login gagal")
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="size-4 fill-current">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          Mailcach
        </a>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Selamat datang kembali</CardTitle>
              <CardDescription>
                Masuk dengan akun Google atau email Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Field>
                    <Button variant="outline" type="button" className="w-full">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      Masuk dengan Google
                    </Button>
                  </Field>

                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Atau lanjutkan dengan
                  </FieldSeparator>

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@contoh.com"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      {...register("email")}
                    />
                    <FieldError errors={[errors.email]} />
                  </Field>

                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <a
                        href="#"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Lupa password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      {...register("password")}
                    />
                    <FieldError errors={[errors.password]} />
                  </Field>

                  {serverError && (
                    <Field>
                      <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {serverError}
                      </div>
                    </Field>
                  )}

                  <Field>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="animate-spin" />}
                      {isSubmitting ? "Memproses..." : "Masuk"}
                    </Button>
                    <FieldDescription className="text-center">
                      Belum punya akun?{" "}
                      <Link to="/register" className="underline underline-offset-4 hover:text-primary">
                        Daftar sekarang
                      </Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>

          <FieldDescription className="px-6 text-center">
            Dengan melanjutkan, Anda menyetujui{" "}
            <a href="#">Syarat Layanan</a> dan{" "}
            <a href="#">Kebijakan Privasi</a> kami.
          </FieldDescription>
        </div>
      </div>
    </div>
  )
}
