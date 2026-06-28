import { useEffect, useState } from "react"
import { Loader2, Trash2, Plus, RefreshCw, Copy, Check } from "lucide-react"
import { api, type VoucherFull } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={copy} title="Salin kode">
      {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
    </Button>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherFull[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [customCode, setCustomCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  async function load() {
    setLoading(true)
    try {
      setVouchers(await api.admin.vouchers.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function create() {
    const amt = parseInt(amount.replace(/\D/g, ""), 10)
    if (!amt || amt <= 0) { setCreateError("Masukkan jumlah kredit yang valid"); return }
    setCreating(true)
    setCreateError("")
    try {
      const voucher = await api.admin.vouchers.create({ amount: amt, code: customCode.trim() || undefined })
      setVouchers((prev) => [voucher, ...prev])
      setOpen(false)
      setAmount("")
      setCustomCode("")
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Gagal membuat voucher")
    } finally {
      setCreating(false)
    }
  }

  async function deleteVoucher(id: number) {
    try {
      await api.admin.vouchers.delete(id)
      setVouchers((prev) => prev.filter((v) => v.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus")
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
  if (error) return <p className="p-6 text-destructive">{error}</p>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voucher Redeem</h1>
          <p className="text-muted-foreground text-sm">{vouchers.length} voucher dibuat</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="size-4 mr-1" />Buat Voucher</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Buat Voucher Baru</DialogTitle></DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel>Jumlah Kredit (Rp)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="contoh: 10000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Kode Voucher <span className="text-muted-foreground font-normal">(opsional, auto-generate jika kosong)</span></FieldLabel>
                  <Input
                    placeholder="contoh: HJAKSIAK"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                </Field>
                {createError && <FieldError>{createError}</FieldError>}
              </FieldGroup>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button onClick={create} disabled={creating}>
                  {creating ? <><Loader2 className="animate-spin size-4 mr-1" />Membuat...</> : "Buat Voucher"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead className="text-right">Nilai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Diredeemed oleh</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold tracking-widest">{v.code}</span>
                    <CopyButton text={v.code} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">Rp {v.amount.toLocaleString("id-ID")}</TableCell>
                <TableCell>
                  <Badge variant={v.isUsed ? "secondary" : "default"}>
                    {v.isUsed ? "Terpakai" : "Aktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {v.redemption ? (
                    <span>{v.redemption.user.name}<br /><span className="text-xs">{formatDate(v.redemption.redeemedAt)}</span></span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(v.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {!v.isUsed && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive"><Trash2 className="size-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus voucher {v.code}?</AlertDialogTitle>
                          <AlertDialogDescription>Voucher ini akan dihapus permanen.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteVoucher(v.id)} className="bg-destructive text-white">Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
