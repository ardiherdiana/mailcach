import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { AuthUser } from "@/lib/api"

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser) => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("mailcach_token")
  )
  const [user, setUserState] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("mailcach_user")
    return stored ? (JSON.parse(stored) as AuthUser) : null
  })

  useEffect(() => {
    if (token) localStorage.setItem("mailcach_token", token)
    else localStorage.removeItem("mailcach_token")
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem("mailcach_user", JSON.stringify(user))
    else localStorage.removeItem("mailcach_user")
  }, [user])

  function login(newToken: string, newUser: AuthUser) {
    setToken(newToken)
    setUserState(newUser)
  }

  function logout() {
    setToken(null)
    setUserState(null)
  }

  function setUser(updated: AuthUser) {
    setUserState(updated)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        setUser,
        isAuthenticated: !!token,
        isAdmin: user?.role === "ADMIN",
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
