import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Skeleton } from './Surface'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
  /** Used as the headline when the row collapses to a card on small screens. */
  primary?: boolean
  /** Secondary identifier shown beside the headline on small screens. */
  secondary?: boolean
  /** Dropped entirely on small screens, for genuinely low-value columns. */
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  loading?: boolean
  skeletonRows?: number
  empty?: ReactNode
  onRowClick?: (row: T) => void
  caption?: string
}

/**
 * One table implementation for the whole app.
 *
 * <p>Below `md` the table does not shrink -- it restructures into one card per
 * row, because a horizontally scrolling table on a phone hides exactly the
 * columns that matter. The same column definitions drive both layouts, so the
 * two can never disagree about what a row contains.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  skeletonRows = 5,
  empty,
  onRowClick,
  caption,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton columns={columns} rows={skeletonRows} />
  }

  if (rows.length === 0) {
    return <>{empty}</>
  }

  const primary = columns.find((c) => c.primary) ?? columns[0]
  const secondary = columns.find((c) => c.secondary)
  // Right-aligned columns are the numeric ones -- amounts and balances. On a
  // phone those are what the row is actually about, so they get their own
  // emphasised line rather than being squeezed into a half-width grid cell.
  const figure = columns.find((c) => c.align === 'right' && c !== primary && c !== secondary)
  const rest = columns.filter((c) => c !== primary && c !== secondary && c !== figure && !c.hideOnMobile)

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    't-label whitespace-nowrap px-4 py-2.5 text-[var(--text-tertiary)]',
                    col.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-[var(--border-subtle)] last:border-0',
                  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                  onRowClick && 'cursor-pointer hover:bg-[var(--surface-hover)]',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      't-body px-4 py-3 text-[var(--text-primary)]',
                      col.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per row */}
      <ul className="divide-y divide-[var(--border-subtle)] md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
              className={cn(
                'flex flex-col gap-2 px-4 py-3.5',
                onRowClick && 'cursor-pointer active:bg-[var(--surface-active)]',
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-subhead min-w-0 truncate text-[var(--text-primary)]">{primary.render(row)}</span>
                {secondary && <span className="shrink-0">{secondary.render(row)}</span>}
              </div>
              {figure && <div className="text-[1.0625rem]">{figure.render(row)}</div>}
              {rest.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {rest.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="t-label text-[var(--text-tertiary)]">{col.header}</dt>
                      <dd className="t-caption mt-0.5 truncate text-[var(--text-secondary)]">{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function TableSkeleton<T>({ columns, rows }: { columns: Column<T>[]; rows: number }) {
  return (
    <div className="px-4 py-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 border-b border-[var(--border-subtle)] py-3.5 last:border-0">
          {columns.map((col, colIndex) => (
            <Skeleton
              key={col.key}
              className={cn('h-3.5', colIndex === 0 ? 'w-32' : 'flex-1', col.align === 'right' && 'ml-auto max-w-24')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
