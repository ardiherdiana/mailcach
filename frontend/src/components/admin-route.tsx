import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import type { ReactNode } from "react"

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
