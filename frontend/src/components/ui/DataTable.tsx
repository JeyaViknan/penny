import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconCaretDown, IconCaretUp } from '../Icons'

export interface Column<T> {
  key: string
  header: string
  /** Money and counts go right; everything else left. */
  align?: 'left' | 'right'
  /** A fixed width keeps a column from collapsing when its cells are short. */
  width?: string
  /** Set when the server can sort by this column. The key is passed back up. */
  sortable?: boolean
  /**
   * Below which viewport width this column is dropped. Columns disappear in
   * order of how little they carry, so the table degrades by shedding detail
   * rather than by compressing everything into unreadability.
   */
  minWidth?: 'lg' | 'xl'
  render: (row: T) => ReactNode
}

export interface SortState {
  key: string
  direction: 'ASC' | 'DESC'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  /** Opens the row. Also bound to Enter, which is what makes the table keyboard-usable. */
  onOpenRow?: (row: T) => void
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  /** Marks the row currently open in a drawer, so the list keeps its place. */
  selectedKey?: string | number | null
  emptyState?: ReactNode
  /** Rendered under the table: counts and page controls. */
  footer?: ReactNode
  caption?: string
  /**
   * How one row reads below 768px, where the table is replaced rather than
   * compressed. A six-column table on a phone is either unreadable or a
   * horizontal scroll, and horizontal scrolling inside a list is how a layout
   * announces that it ran out of ideas. Omit it and the table simply scrolls,
   * which is the right fallback for a table nobody opens on a phone.
   */
  mobileRow?: (row: T) => ReactNode
}

/**
 * The table that every list in Penny is built from.
 *
 * <p>One grammar for transactions, an account's ledger, accounts, people and
 * the audit trail, so learning to read one teaches all five. That uniformity is
 * the point: a ledger row is meaningful mostly by comparison with the rows
 * around it, and comparison depends on columns landing in the same place every
 * time.
 *
 * <p><b>Keyboard.</b> Arrow keys and j/k step through rows, Enter opens one,
 * and focus is real DOM focus on the row element rather than a rendered
 * highlight -- so the browser scrolls it into view, screen readers announce it,
 * and the ring is the same one every other control uses. Roving tabindex keeps
 * the whole table a single tab stop instead of hundreds.
 *
 * <p>Rendered as a real &lt;table&gt;. A grid of divs looks identical and tells
 * assistive technology nothing about which header a cell belongs to.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onOpenRow,
  sort,
  onSortChange,
  selectedKey,
  emptyState,
  footer,
  caption,
  mobileRow,
}: DataTableProps<T>) {
  const bodyRef = useRef<HTMLTableSectionElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  // A shrinking list must not leave focus pointing past the end.
  useEffect(() => {
    setFocusedIndex((current) => Math.min(current, Math.max(rows.length - 1, 0)))
  }, [rows.length])

  const focusRow = useCallback((index: number) => {
    const el = bodyRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]')[index]
    el?.focus()
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, index: number, row: T) => {
    const last = rows.length - 1
    let next: number | null = null

    if (event.key === 'ArrowDown' || event.key === 'j') next = Math.min(index + 1, last)
    else if (event.key === 'ArrowUp' || event.key === 'k') next = Math.max(index - 1, 0)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else if (event.key === 'Enter' || event.key === ' ') {
      if (onOpenRow) {
        event.preventDefault()
        onOpenRow(row)
      }
      return
    } else return

    event.preventDefault()
    setFocusedIndex(next)
    focusRow(next)
  }

  if (rows.length === 0 && emptyState) {
    return <div className="overflow-hidden rounded-md border border-line bg-surface">{emptyState}</div>
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      {/* Below 768 the table is swapped for stacked rows rather than squeezed.
          Above it, a wide table scrolls inside its own container so the page
          body never scrolls sideways. */}
      {mobileRow && (
        <ul className="md:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={onOpenRow ? () => onOpenRow(row) : undefined}
                disabled={!onOpenRow}
                className="focus-inset block w-full px-3 py-2.5 text-left disabled:cursor-default"
              >
                {mobileRow(row)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={cn('overflow-x-auto', mobileRow && 'hidden md:block')}>
        <table className="w-full border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line bg-sunken">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  aria-sort={
                    sort?.key === column.key
                      ? sort.direction === 'ASC'
                        ? 'ascending'
                        : 'descending'
                      : column.sortable
                        ? 'none'
                        : undefined
                  }
                  className={cn(
                    'h-[var(--h-row-head)] px-3 font-normal whitespace-nowrap',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    responsiveClass(column.minWidth),
                  )}
                >
                  {column.sortable && onSortChange ? (
                    <SortButton column={column} sort={sort} onSortChange={onSortChange} />
                  ) : (
                    <span className="t-col">{column.header}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {rows.map((row, index) => {
              const key = rowKey(row)
              const selected = selectedKey != null && selectedKey === key
              return (
                <tr
                  key={key}
                  data-row
                  tabIndex={index === focusedIndex ? 0 : -1}
                  aria-selected={selected || undefined}
                  onFocus={() => setFocusedIndex(index)}
                  onKeyDown={(event) => handleKeyDown(event, index, row)}
                  onClick={onOpenRow ? () => onOpenRow(row) : undefined}
                  className={cn(
                    'focus-row border-b border-line last:border-b-0',
                    'transition-colors duration-[var(--dur-fast)]',
                    onOpenRow && 'cursor-pointer',
                    selected ? 'bg-[var(--surface-active)]' : 'hover:bg-hover',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'h-[var(--h-row)] px-3 align-middle',
                        column.align === 'right' ? 'text-right' : 'text-left',
                        responsiveClass(column.minWidth),
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="flex h-11 items-center justify-between gap-4 border-t border-line px-3">
          {footer}
        </div>
      )}
    </div>
  )
}

/**
 * Column headers sort on click and cycle direction on repeat. The caret shows
 * only on the active column: an arrow on every header tells you nothing about
 * which one is in effect.
 */
function SortButton<T>({
  column,
  sort,
  onSortChange,
}: {
  column: Column<T>
  sort?: SortState
  onSortChange: (sort: SortState) => void
}) {
  const active = sort?.key === column.key
  const direction = active ? sort.direction : 'DESC'

  return (
    <button
      type="button"
      onClick={() =>
        onSortChange({ key: column.key, direction: active && direction === 'DESC' ? 'ASC' : 'DESC' })
      }
      className={cn(
        'group -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5',
        column.align === 'right' && 'flex-row-reverse',
      )}
    >
      <span className={cn('t-col', active && 'text-ink')}>{column.header}</span>
      {active ? (
        direction === 'ASC' ? (
          <IconCaretUp className="h-3 w-3 text-ink" />
        ) : (
          <IconCaretDown className="h-3 w-3 text-ink" />
        )
      ) : (
        <IconCaretDown className="h-3 w-3 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}

function responsiveClass(minWidth: Column<unknown>['minWidth']) {
  if (minWidth === 'lg') return 'hidden lg:table-cell'
  if (minWidth === 'xl') return 'hidden xl:table-cell'
  return ''
}
