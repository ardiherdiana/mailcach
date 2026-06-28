import { AlertTriangle } from "lucide-react"
import { Link } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useCredit, CREDIT_WARNING_THRESHOLD } from "@/contexts/credit-context"

export function LowCreditAlert() {
  const { credits, isLowCredit } = useCredit()
  if (!isLowCredit) return null

  return (
    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="size-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          Saldo kamu tinggal{" "}
          <strong>Rp {credits.toLocaleString("id-ID")}</strong> (batas
          peringatan Rp {CREDIT_WARNING_THRESHOLD.toLocaleString("id-ID")}).
        </span>
        <Button size="sm" variant="outline" className="shrink-0 border-amber-500/40 hover:bg-amber-500/10" asChild>
          <Link to="/dashboard/topup">Top Up Sekarang</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
