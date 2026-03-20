/**
 * Format a number as USD currency.
 */
export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a decimal as a percentage string. e.g. 0.18 → "18.0%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a date string as a human-readable date. e.g. "2026-02-15" → "Feb 15, 2026"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a number as a multiplier. e.g. 1.4 → "1.4x"
 */
export function formatMultiple(value: number): string {
  return `${value.toFixed(2)}x`
}

/**
 * Compute raise progress as a percentage (0–100), capped at 100.
 */
export function raiseProgress(toDate: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((toDate / target) * 100))
}

/**
 * Format distribution type for display.
 */
export function formatDistributionType(type: string): string {
  const map: Record<string, string> = {
    return_of_capital: 'Return of Capital',
    preferred_return: 'Preferred Return',
    profit: 'Profit Distribution',
  }
  return map[type] || type
}
