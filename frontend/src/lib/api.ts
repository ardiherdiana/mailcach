const BASE = "/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("mailcach_token")
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const data = await res.json().catch(() => ({ error: "Request gagal" }))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request gagal")
  return data as T
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("mailcach_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: "ADMIN" | "USER"
  credits: number
  hasPassword?: boolean
  isGoogleLinked?: boolean
}

export interface Transaction {
  id: number
  service: string
  type: "CREDIT" | "DEBIT"
  amount: number
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface VoucherFull {
  id: number
  code: string
  amount: number
  isUsed: boolean
  createdAt: string
  createdBy: { name: string }
  redemption: { user: { name: string; email: string }; redeemedAt: string } | null
}

export interface TurnitinJob {
  id: number
  filename: string
  fileSizeBytes: number
  status: "PENDING" | "COMPLETED" | "FAILED"
  similarityScore: number | null
  adminNote: string | null
  createdAt: string
  updatedAt: string
}

export interface TurnitinJobAdmin extends TurnitinJob {
  user: { id: number; name: string; email: string }
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      request<{ token: string; user: AuthUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    google: (accessToken: string) =>
      request<{ token: string; user: AuthUser }>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ accessToken }),
      }),
    sendRegisterOtp: (email: string, name: string) =>
      request<{ sent: boolean }>("/auth/otp/send-register", {
        method: "POST",
        body: JSON.stringify({ email, name }),
      }),
    verifyRegisterOtp: (email: string, otp: string) =>
      request<{ verified: boolean }>("/auth/otp/verify-register", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      }),
    forgotPassword: (email: string) =>
      request<{ sent: boolean }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (email: string, otp: string, newPassword: string) =>
      request<{ success: boolean }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword }),
      }),
  },

  me: {
    get: () => request<AuthUser>("/me"),
    transactions: () => request<Transaction[]>("/me/transactions"),
    updateProfile: (name: string) =>
      request<AuthUser>("/me/profile", { method: "PATCH", body: JSON.stringify({ name }) }),
    changeEmailSend: (newEmail: string) =>
      request<{ sent: boolean }>("/me/change-email/send", { method: "POST", body: JSON.stringify({ newEmail }) }),
    changeEmailVerify: (newEmail: string, otp: string) =>
      request<AuthUser>("/me/change-email/verify", { method: "POST", body: JSON.stringify({ newEmail, otp }) }),
    changePassword: (newPassword: string, currentPassword?: string) =>
      request<{ success: boolean }>("/me/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  },

  vouchers: {
    redeem: (code: string) =>
      request<{ amount: number; newBalance: number }>("/vouchers/redeem", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
  },

  services: {
    elevenlabs: {
      generate: (data: { script: string; voiceId: string; voiceLabel: string }) =>
        request<{ creditsUsed: number; remainingCredits: number; audioUrl: string | null }>(
          "/services/elevenlabs/generate",
          { method: "POST", body: JSON.stringify(data) }
        ),
    },
    inbox: {
      search: (prefix: string) =>
        request<{
          remainingCredits: number
          emails: { id: string; subject: string; sender: string; recipient: string; body: string; body_html: string; timestamp: number }[]
          prefix: string
          domain: string
        }>("/services/inbox/search", { method: "POST", body: JSON.stringify({ prefix }) }),
      detail: (messageId: string) =>
        request<{
          success: boolean
          email?: { id: string; subject: string; sender: string; recipient: string; body: string; body_html: string; timestamp: number; hasHtml: boolean }
          error?: string
        }>(`/services/inbox/detail?messageId=${encodeURIComponent(messageId)}`),
    },
    envato: {
      packages: () =>
        request<{ id: string; tier: string; label: string; days: number; filesPerDay: number; files: number; price: number }[]>("/services/envato/packages"),
      status: () =>
        request<{ active: boolean; packageId?: string; filesRemaining?: number; filesTotal?: number; expiresAt?: string }>("/services/envato/status"),
      buy: (packageId: string) =>
        request<{ remainingCredits: number; filesRemaining: number; expiresAt: string }>(
          "/services/envato/buy",
          { method: "POST", body: JSON.stringify({ packageId }) }
        ),
      download: async (url: string): Promise<{ blob: Blob; fileName: string; filesRemaining: number }> => {
        const res = await fetch("/api/services/envato/download", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ url }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Download gagal" })) as { error?: string }
          throw new Error(data.error ?? "Download gagal")
        }
        const blob = await res.blob()
        const cd = res.headers.get("content-disposition") ?? ""
        const utf8Match = cd.match(/filename\*=UTF-8''([^;]+)/i)
        const plainMatch = cd.match(/filename="?([^";]+)"?/i)
        const slugFallback = (() => { try { return new URL(url).pathname.split("/").filter(Boolean).pop() + ".zip" } catch { return "asset.zip" } })()
        const fileName = utf8Match ? decodeURIComponent(utf8Match[1]) : plainMatch?.[1] ?? slugFallback
        const filesRemaining = Number(res.headers.get("x-files-remaining") ?? 0)
        return { blob, fileName, filesRemaining }
      },
    },
    turnitin: {
      submit: async (file: File): Promise<{ jobId: number; filename: string; status: string; createdAt: string }> => {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/services/turnitin/submit", {
          method: "POST",
          headers: authHeaders(),
          body: form,
        })
        const data = await res.json().catch(() => ({ error: "Request gagal" }))
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request gagal")
        return data
      },
      jobs: () => request<TurnitinJob[]>("/services/turnitin/jobs"),
      downloadResult: (jobId: number) => {
        const token = localStorage.getItem("mailcach_token")
        window.open(`/api/services/turnitin/jobs/${jobId}/download?token=${token}`, "_blank")
      },
    },
  },

  admin: {
    users: {
      list: () => request<AuthUser[]>("/admin/users"),
      update: (id: number, data: { role?: "ADMIN" | "USER"; credits?: number }) =>
        request<AuthUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: number) =>
        request<void>(`/admin/users/${id}`, { method: "DELETE" }),
    },
    envatoSession: {
      get: () => request<{ active: boolean; updatedAt?: string; note?: string; cookiePreview?: string }>("/admin/envato-session"),
      set: (data: { cookies: string; userAgent?: string; note?: string }) =>
        request<{ active: boolean; updatedAt: string }>("/admin/envato-session", { method: "POST", body: JSON.stringify(data) }),
      clear: () => request<{ active: boolean }>("/admin/envato-session", { method: "DELETE" }),
    },
    vouchers: {
      list: () => request<VoucherFull[]>("/admin/vouchers"),
      create: (data: { amount: number; code?: string }) =>
        request<VoucherFull>("/admin/vouchers", { method: "POST", body: JSON.stringify(data) }),
      delete: (id: number) =>
        request<void>(`/admin/vouchers/${id}`, { method: "DELETE" }),
    },
    turnitin: {
      jobs: () => request<TurnitinJobAdmin[]>("/admin/turnitin/jobs"),
      downloadFile: (jobId: number) => {
        const token = localStorage.getItem("mailcach_token")
        window.open(`/api/admin/turnitin/jobs/${jobId}/file?token=${token}`, "_blank")
      },
      complete: async (jobId: number, resultFile: File, similarityScore: number | null, adminNote?: string) => {
        const form = new FormData()
        form.append("result", resultFile)
        if (similarityScore !== null) form.append("similarityScore", String(similarityScore))
        if (adminNote) form.append("adminNote", adminNote)
        const res = await fetch(`/api/admin/turnitin/jobs/${jobId}/complete`, {
          method: "POST",
          headers: authHeaders(),
          body: form,
        })
        const data = await res.json().catch(() => ({ error: "Request gagal" }))
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request gagal")
        return data
      },
      delete: (jobId: number) => request<void>(`/admin/turnitin/jobs/${jobId}`, { method: "DELETE" }),
    },
  },
}
