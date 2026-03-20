import { Progress } from '@/components/ui/progress'
import { formatCurrency, raiseProgress } from '@/lib/utils/format'

interface RaiseProgressBarProps {
  raiseToDate: number
  raiseTarget: number
  showAmounts?: boolean
}

export default function RaiseProgressBar({
  raiseToDate,
  raiseTarget,
  showAmounts = true,
}: RaiseProgressBarProps) {
  const pct = raiseProgress(raiseToDate, raiseTarget)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Capital Raised</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      {showAmounts && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(raiseToDate, true)} raised</span>
          <span>{formatCurrency(raiseTarget, true)} target</span>
        </div>
      )}
    </div>
  )
}
