import { useEffect, useState } from "react"
import { Download, Mic, FolderDown, Loader2, Ticket } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, type Transaction } from "@/lib/api"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const SERVICE_META: Record<string, { label: string; icon: typeof Mic; badgeClass: string }> = {
  elevenlabs: { label: "ElevenLabs", icon: Mic, badgeClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  envato: { label: "Envato", icon: FolderDown, badgeClass: "bg-green-500/15 text-green-600 dark:text-green-400" },
  voucher: { label: "Voucher", icon: Ticket, badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    api.me.transactions()
      .then(setTransactions)
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat riwayat"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
  if (error) return <p className="p-6 text-destructive">{error}</p>

  if (transactions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Download className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-heading font-semibold">Belum ada riwayat</h2>
          <p className="text-sm text-muted-foreground">Gunakan salah satu layanan untuk melihat riwayat di sini.</p>
        </div>
        <Button asChild><Link to="/dashboard">Kembali ke Dashboard</Link></Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">Riwayat</h2>
        <p className="text-sm text-muted-foreground">{transactions.length} transaksi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Semua Transaksi</CardTitle>
          <CardDescription>ElevenLabs · Envato Elements · Voucher</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Layanan</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const meta = SERVICE_META[tx.service] ?? { label: tx.service, icon: Download, badgeClass: "" }
                const Icon = meta.icon
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant="secondary" className={`gap-1 text-xs ${meta.badgeClass}`}>
                        <Icon className="size-3" />
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-sm">{tx.description ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "CREDIT" ? "default" : "secondary"} className="text-xs">
                        {tx.type === "CREDIT" ? "+ Kredit" : "- Kredit"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums text-sm font-medium ${tx.type === "CREDIT" ? "text-primary" : ""}`}>
                      {tx.type === "CREDIT" ? "+" : "-"}Rp {tx.amount.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
