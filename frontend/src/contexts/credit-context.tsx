import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export const CREDIT_WARNING_THRESHOLD = 5_000

interface CreditContextValue {
  credits: number
  loading: boolean
  refresh: () => Promise<void>
  setCredits: (n: number) => void
  isLowCredit: boolean
}

const CreditContext = createContext<CreditContextValue | null>(null)

export function CreditProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, setUser, user } = useAuth()
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const me = await api.me.get()
      setCredits(me.credits)
      if (user) setUser({ ...user, credits: me.credits })
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAuthenticated) refresh()
    else setCredits(0)
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CreditContext.Provider value={{ credits, loading, refresh, setCredits, isLowCredit: credits < CREDIT_WARNING_THRESHOLD }}>
      {children}
    </CreditContext.Provider>
  )
}

export function useCredit() {
  const ctx = useContext(CreditContext)
  if (!ctx) throw new Error("useCredit must be used within CreditProvider")
  return ctx
}
