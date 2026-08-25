import type { AccountResponse } from '../api/types'
import { cn } from '../lib/cn'
import { formatMinorUnits } from '../lib/money'
import { Skeleton } from './ui/Surface'

/**
 * The account rendered as a physical card, the way Wallet leads with the card
 * itself before any transaction list.
 *
 * <p>The surface is a very restrained near-white gradient meant to read as
 * brushed material catching light, not as decoration — the same restraint as
 * Apple Card's titanium. The balance is the largest element on the screen
 * because it is the one thing the person came to find out.
 */
export function BalanceCard({
  account,
  loading,
  className,
}: {
  account?: AccountResponse | null
  loading?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-hero)] p-6',
        'shadow-[var(--shadow-raised)]',
        className,
      )}
      style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #fbfbfd 46%, #f0f0f4 100%)',
      }}
    >
      {/* A single soft highlight, angled like a light source above-left. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full opacity-70"
        style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.10) 0%, rgba(0,122,255,0) 68%)' }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="t-footnote font-medium text-[var(--label-tertiary)]">
            {loading || !account ? 'Account' : titleCase(account.accountType)}
          </p>
          {loading || !account ? (
            <Skeleton className="mt-2 h-3.5 w-24" />
          ) : (
            <p className="t-subhead mt-1 tabular-nums text-[var(--label-secondary)]">
              ···· {account.accountNumber.slice(-4)}
            </p>
          )}
        </div>
        <Wordmark />
      </div>

      <div className="relative mt-8">
        <p className="t-footnote font-medium text-[var(--label-tertiary)]">Available balance</p>
        {loading || !account ? (
          <Skeleton className="mt-2 h-10 w-44" />
        ) : (
          <p className="t-money mt-1 text-[38px] font-semibold leading-none text-[var(--label)]">
            {formatMinorUnits(account.balanceMinorUnits, account.currency)}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Summary card for the overview screen, where the figure is a total across
 * accounts rather than one card's balance.
 */
export function TotalCard({
  label,
  amountMinorUnits,
  caption,
  loading,
}: {
  label: string
  amountMinorUnits: number
  caption?: string
  loading?: boolean
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 shadow-[var(--shadow-raised)]"
      style={{ background: 'linear-gradient(160deg, #ffffff 0%, #fbfbfd 46%, #f0f0f4 100%)' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full opacity-70"
        style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.10) 0%, rgba(0,122,255,0) 68%)' }}
      />
      <div className="relative flex items-start justify-between">
        <p className="t-footnote font-medium text-[var(--label-tertiary)]">{label}</p>
        <Wordmark />
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-11 w-52" />
      ) : (
        <p className="t-money relative mt-3 text-[42px] font-semibold leading-none text-[var(--label)]">
          {formatMinorUnits(amountMinorUnits)}
        </p>
      )}
      {caption && <p className="t-footnote relative mt-2.5 text-[var(--label-tertiary)]">{caption}</p>}
    </div>
  )
}

function Wordmark() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-[var(--blue)] text-[11px] font-bold text-white">
        P
      </div>
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--label-secondary)]">Penny</span>
    </div>
  )
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}
