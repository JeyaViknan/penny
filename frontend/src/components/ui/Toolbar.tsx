import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconClose, IconSearch } from '../Icons'
import { Button } from './Button'

/**
 * Search box for a toolbar. Focused by pressing `/` anywhere on the page, which
 * is the one keyboard shortcut worth having here: filtering is the action
 * people repeat, and reaching for the mouse to start typing is the friction.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  shortcut = true,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  shortcut?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!shortcut) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey) return
      const target = event.target as HTMLElement | null
      // Do not steal the keystroke from someone typing a slash into a field.
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      if (typing) return
      event.preventDefault()
      ref.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcut])

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-72">
      <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'h-[var(--h-control)] w-full rounded-sm border border-line-strong bg-surface pr-2.5 pl-7.5 text-[13px]',
          'text-ink placeholder:text-ink-3 hover:border-[var(--ink-faint)]',
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
    </div>
  )
}

/**
 * A labelled dropdown that sits in a toolbar. Kept as a native `<select>`: it
 * is keyboard-navigable, screen-reader-correct and touch-native for free, and a
 * hand-built listbox buys nothing here that would repay reimplementing all three.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const active = value !== ''
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={cn(
        'h-[var(--h-control)] shrink-0 rounded-sm border px-2 pr-6 text-[13px] appearance-none',
        'bg-[position:right_5px_center] bg-[length:14px_14px] bg-no-repeat',
        active
          ? 'border-ink bg-surface font-medium text-ink'
          : 'border-line-strong bg-surface text-ink-2 hover:border-[var(--ink-faint)]',
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' stroke='%236e6e66' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 8l5 4.5L15 8'/%3E%3C/svg%3E\")",
      }}
    >
      <option value="">{label}: any</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {label}: {option.label}
        </option>
      ))}
    </select>
  )
}

/**
 * Clears every filter at once. Appears only when something is filtered — a
 * permanently visible "Clear" on an unfiltered list is a control that does
 * nothing, and controls that do nothing train people to ignore controls.
 */
export function ClearFilters({ show, onClear }: { show: boolean; onClear: () => void }) {
  if (!show) return null
  return (
    <Button variant="ghost" size="md" onClick={onClear} iconLeft={<IconClose className="h-3.5 w-3.5" />}>
      Clear
    </Button>
  )
}

/**
 * Row count and page controls. Explicit paging, not infinite scroll: an auditor
 * needs "1–50 of 3,214" and a position they can return to, and infinite scroll
 * destroys both while also breaking the browser's back button.
 */
export function Pagination({
  page,
  size,
  totalItems,
  onPageChange,
  noun = 'rows',
}: {
  page: number
  size: number
  totalItems: number
  onPageChange: (page: number) => void
  noun?: string
}) {
  const first = totalItems === 0 ? 0 : page * size + 1
  const last = Math.min((page + 1) * size, totalItems)
  const lastPage = Math.max(Math.ceil(totalItems / size) - 1, 0)

  return (
    <>
      <p className="t-micro">
        {totalItems === 0
          ? `No ${noun}`
          : `${first.toLocaleString()}–${last.toLocaleString()} of ${totalItems.toLocaleString()} ${noun}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 0}>
          Previous
        </Button>
        <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
          Next
        </Button>
      </div>
    </>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex w-full items-center gap-2 overflow-x-auto">{children}</div>
}
