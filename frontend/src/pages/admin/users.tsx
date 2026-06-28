import { useEffect, useState } from "react"
import { Loader2, Trash2, ShieldCheck, ShieldOff } from "lucide-react"
import { api, type AuthUser } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    try {
      setUsers(await api.admin.users.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleRole(u: AuthUser) {
    const newRole = u.role === "ADMIN" ? "USER" : "ADMIN"
    try {
      const updated = await api.admin.users.update(u.id, { role: newRole })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mengubah role")
    }
  }

  async function deleteUser(id: number) {
    try {
      await api.admin.users.delete(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus")
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
  if (error) return <p className="p-6 text-destructive">{error}</p>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manajemen User</h1>
        <p className="text-muted-foreground text-sm">Total {users.length} user terdaftar</p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  Rp {u.credits.toLocaleString("id-ID")}
                </TableCell>
                <TableCell className="text-right">
                  {u.id !== me?.id && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleRole(u)}
                        title={u.role === "ADMIN" ? "Turunkan ke User" : "Jadikan Admin"}
                      >
                        {u.role === "ADMIN" ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive"><Trash2 className="size-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus user {u.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Semua data user ini akan dihapus permanen dan tidak bisa dikembalikan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUser(u.id)} className="bg-destructive text-white">Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
