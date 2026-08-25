import { cn } from '../../lib/cn'
import { formatMinorUnits } from '../../lib/money'

interface MoneyProps {
  minorUnits: number
  currency?: string
  /**
   * `signed` prefixes + or − and colours incoming money green. `plain` shows
   * the magnitude in ink. `balance` shows ink, turning negative only when the
   * figure genuinely is.
   */
  variant?: 'plain' | 'signed' | 'balance'
  className?: string
}

/**
 * Every amount in the product renders through here.
 *
 * <p>Two rules it exists to enforce. Amounts are tabular and right-aligned, so
 * the decimal points line up down a column and the eye can compare magnitudes
 * without reading digits. And outgoing money is <b>ink, not red</b> -- a debit
 * is the single most ordinary event in a ledger, and colouring every one of
 * them red makes a normal day's activity look like a page of errors. Red is
 * kept for things that are actually wrong.
 */
export function Money({ minorUnits, currency = 'USD', variant = 'plain', className }: MoneyProps) {
  const formatted = formatMinorUnits(Math.abs(minorUnits), currency)

  if (variant === 'signed') {
    const incoming = minorUnits > 0
    return (
      <span
        className={cn('t-money', incoming ? 'text-positive' : 'text-ink', className)}
        // The minus sign is U+2212, not a hyphen: it is the width of a digit,
        // so a column of negative figures stays aligned with the positive ones.
      >
        {incoming ? '+' : '−'}
        {formatted}
      </span>
    )
  }

  return (
    <span
      className={cn('t-money', variant === 'balance' && minorUnits < 0 ? 'text-negative' : 'text-ink', className)}
    >
      {variant === 'balance' && minorUnits < 0 ? '−' : ''}
      {formatted}
    </span>
  )
}
