import type { TransactionSummaryResponse } from '../api/types'
import { titleCase } from '../lib/text'
import { formatMinorUnits, formatRelativeDate } from '../lib/money'
import { IconDeposit, IconTransfer, IconWithdraw } from './Icons'
import { Glyph, ListRow } from './ui/List'
import { Skeleton } from './ui/Surface'

/**
 * One transaction, in Apple Card's row shape: a coloured glyph encoding the
 * kind of movement, the reference as the headline, when it happened beneath,
 * and the amount right-aligned in tabular figures.
 */
export function TransactionRow({ transaction }: { transaction: TransactionSummaryResponse }) {
  const { icon, tone } = TRANSACTION_STYLE[transaction.transactionType]
  return (
    <ListRow
      to={`/transfers/${transaction.transactionId}`}
      leading={<Glyph tone={tone}>{icon}</Glyph>}
      title={transaction.reference}
      subtitle={`${titleCase(transaction.transactionType)} · ${formatRelativeDate(transaction.createdAt)}`}
      value={<span className="t-money">{formatMinorUnits(transaction.amountMinorUnits)}</span>}
    />
  )
}

const TRANSACTION_STYLE = {
  DEPOSIT: { icon: <IconDeposit className="h-[18px] w-[18px]" />, tone: 'green' as const },
  WITHDRAWAL: { icon: <IconWithdraw className="h-[18px] w-[18px]" />, tone: 'orange' as const },
  TRANSFER: { icon: <IconTransfer className="h-[18px] w-[18px]" />, tone: 'blue' as const },
}

/** Placeholder rows that mirror the shape of a real row, so nothing jumps on load. */
export function RowSkeletons({ count }: { count: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="list-row list-row-inset relative flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  )
}
