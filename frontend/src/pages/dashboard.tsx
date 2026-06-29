import { useEffect, useState } from "react"
import { Mic, ArrowRight, FolderDown, Loader2, TrendingDown, TrendingUp, Layers, Inbox, ShieldAlert } from "lucide-react"
import { Link } from "react-router-dom"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useCredit } from "@/contexts/credit-context"
import { LowCreditAlert } from "@/components/low-credit-alert"
import { api, type Transaction } from "@/lib/api"

const services = [
  {
    to: "/dashboard/envato",
    icon: FolderDown,
    label: "Envato Elements",
    description: "Download template, musik, font, dan ribuan aset kreatif dari Envato Elements dengan harga per-file tanpa subscribe bulanan.",
    badge: "Download",
    badgeClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    iconClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    priceNote: "Rp 1.000 / file",
    bestSeller: true,
  },
  {
    to: "/dashboard/turnitin",
    icon: ShieldAlert,
    label: "Turnitin",
    description: "Cek tingkat plagiarisme dokumen kamu via Turnitin. Upload file, tim kami proses dan laporan similarity siap diunduh.",
    badge: "Plagiarisme",
    badgeClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    iconClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    priceNote: "Rp 10.000 / dokumen",
    bestSeller: true,
  },
  {
    to: "/dashboard/generate",
    icon: Mic,
    label: "ElevenLabs",
    description: "Generate voice over narasi berkualitas studio pakai AI ElevenLabs dengan ratusan pilihan suara, bayar per karakter sesuai panjang teks.",
    badge: "Voice",
    badgeClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    iconClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    priceNote: "Rp 5 / karakter",
    bestSeller: false,
  },
  {
    to: "/dashboard/inbox",
    icon: Inbox,
    label: "Email Inbox",
    description: "Terima dan cari email masuk di domain platform secara instan, sangat berguna untuk verifikasi akun, registrasi, dan kode OTP.",
    badge: "Inbox",
    badgeClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    iconClass: "bg-green-500/15 text-green-600 dark:text-green-400",
    priceNote: "Rp 10 / pencarian",
    bestSeller: false,
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
        <p className="text-sm text-muted-foreground">Akses layanan AI & aset kreatif premium dengan satu akun.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card size="sm" className="">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1 text-green-700 dark:text-green-400"><TrendingDown className="size-3" /> Total Pengeluaran</CardDescription>
            <CardTitle className="text-xl tabular-nums text-green-700 dark:text-green-300">
              {loading ? <Loader2 className="size-4 animate-spin" /> : `Rp ${totalSpent.toLocaleString("id-ID")}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1 text-green-700 dark:text-green-400"><TrendingUp className="size-3" /> Total Top Up</CardDescription>
            <CardTitle className="text-xl tabular-nums text-green-700 dark:text-green-300">
              {loading ? <Loader2 className="size-4 animate-spin" /> : `Rp ${totalTopup.toLocaleString("id-ID")}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1 text-green-700 dark:text-green-400"><Layers className="size-3" /> Transaksi</CardDescription>
            <CardTitle className="text-xl tabular-nums text-green-700 dark:text-green-300">
              {loading ? <Loader2 className="size-4 animate-spin" /> : txns.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="">
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1 text-green-700 dark:text-green-400"><Mic className="size-3" /> Layanan Dipakai</CardDescription>
            <CardTitle className="text-xl tabular-nums text-green-700 dark:text-green-300">
              {loading ? <Loader2 className="size-4 animate-spin" /> : uniqueServices}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-muted-foreground">Layanan</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {services.map(({ to, icon: Icon, label, description, badge, badgeClass, iconClass, priceNote, bestSeller }) => (
            <Link key={to} to={to}>
              <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                <CardHeader className="flex-1 pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`flex size-9 items-center justify-center rounded-lg ${iconClass}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      {bestSeller && <Badge className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">⭐ Best Seller</Badge>}
                      <Badge variant="secondary" className={`text-xs ${badgeClass}`}>{badge}</Badge>
                    </div>
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

    </div>
  )
}
