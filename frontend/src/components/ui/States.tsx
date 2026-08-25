import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconAlert } from '../Icons'
import { Button } from './Button'

/**
 * Loading, empty, failed and loaded — decided in one place.
 *
 * <p>The same `loading ? skeleton : empty ? placeholder : rows` ladder was
 * written out eight times across the old pages, and three of those forgot the
 * error branch entirely: a failed fetch rendered "Nothing has moved yet",
 * which tells someone their data is gone when in fact the request failed. The
 * ladder being in one component is what makes that impossible rather than
 * merely discouraged.
 */
export function AsyncSection<T>({
  data,
  loading,
  error,
  onRetry,
  isEmpty,
  empty,
  skeleton,
  children,
}: {
  data: T | null
  loading: boolean
  error: string | null
  onRetry?: () => void
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  skeleton?: ReactNode
  children: (data: T) => ReactNode
}) {
  // Error first. A request that failed is not an empty result, and showing the
  // empty state for it is the worst of the four outcomes: it is confidently wrong.
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (loading && data === null) return <>{skeleton ?? <TableSkeleton />}</>
  if (data === null) return null
  if (isEmpty?.(data) && empty) return <>{empty}</>
  return <>{children(data)}</>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-6">
      <div className="flex items-start gap-3">
        <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">That didn’t load</p>
          {/* The server's own message, not a generic apology. Someone who can
              act on "Account is frozen" cannot act on "Something went wrong". */}
          <p className="t-body mt-0.5 text-ink-2">{message}</p>
        </div>
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description && <p className="t-body mx-auto mt-1 max-w-[44ch] text-ink-2">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/**
 * Skeleton rows are the height of the rows they stand in for and there are as
 * many as a page normally holds. The old ones were arbitrary counts — 2, 3, 4,
 * 6 — chosen per page, so the layout jumped when real data arrived.
 */
export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface" aria-hidden="true">
      <div className="h-[var(--h-row-head)] border-b border-line bg-sunken" />
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex h-[var(--h-row)] items-center gap-3 border-b border-line px-3 last:border-b-0"
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Shimmer
              key={columnIndex}
              className={cn('h-3', columnIndex === 0 ? 'w-24' : columnIndex === columns - 1 ? 'ml-auto w-16' : 'w-20')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Shimmer({ className }: { className?: string }) {
  return <span className={cn('block animate-pulse rounded-sm bg-[var(--surface-active)]', className)} />
}
