import { useEffect, useState } from "react"
import { Mic, ArrowRight, FolderDown, History, CreditCard, Loader2, TrendingDown, TrendingUp, Layers } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useCredit } from "@/contexts/credit-context"
import { LowCreditAlert } from "@/components/low-credit-alert"
import { api, type Transaction } from "@/lib/api"

const services = [
  {
    to: "/dashboard/generate",
    icon: Mic,
    label: "ElevenLabs",
    description: "Ubah script narasi jadi audio AI berkualitas tinggi",
    badge: "Voice",
    badgeClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    priceNote: "Rp 5 / karakter",
  },
  {
    to: "/dashboard/envato",
    icon: FolderDown,
    label: "Envato Elements",
    description: "Download template, musik, font, dan aset kreatif premium",
    badge: "Download",
    badgeClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    iconClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    priceNote: "Rp 2.000 / file",
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  useCredit()
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me.transactions()
      .then(setTxns)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalSpent = txns.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0)
  const totalTopup = txns.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0)
  const uniqueServices = new Set(txns.filter((t) => t.type === "DEBIT").map((t) => t.service)).size

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <LowCreditAlert />

      <div>
        <h2 className="font-heading text-lg font-semibold">Halo, {user?.name?.split(" ")[0]} 👋</h2>
        <p className="text-sm text-muted-foreground">Mau pakai layanan apa hari ini?</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1"><TrendingDown className="size-3" /> Total Pengeluaran</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : `Rp ${totalSpent.toLocaleString("id-ID")}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1"><TrendingUp className="size-3" /> Total Top Up</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : `Rp ${totalTopup.toLocaleString("id-ID")}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1"><Layers className="size-3" /> Transaksi</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : txns.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1"><Mic className="size-3" /> Layanan Dipakai</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : uniqueServices}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Layanan</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {services.map(({ to, icon: Icon, label, description, badge, badgeClass, iconClass, priceNote }) => (
            <Link key={to} to={to}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`flex size-9 items-center justify-center rounded-lg ${iconClass}`}>
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="secondary" className={`text-xs ${badgeClass}`}>{badge}</Badge>
                  </div>
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{priceNote}</span>
                  <span className="flex items-center gap-1 text-xs text-primary">Buka <ArrowRight className="size-3" /></span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

<div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/history"><History className="size-4" /> Riwayat</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/topup"><CreditCard className="size-4" /> Top Up Kredit</Link>
        </Button>
      </div>
    </div>
  )
}
