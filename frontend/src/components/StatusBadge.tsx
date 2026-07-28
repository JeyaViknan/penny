const STYLES: Record<string, string> = {
  ACTIVE: 'bg-[var(--color-positive-muted)] text-[var(--color-positive)]',
  INACTIVE: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  CLOSED: 'bg-[var(--color-negative-muted)] text-[var(--color-negative)]',
  DEBIT: 'bg-[var(--color-negative-muted)] text-[var(--color-negative)]',
  CREDIT: 'bg-[var(--color-positive-muted)] text-[var(--color-positive)]',
}

export function StatusBadge({ value }: { value: string }) {
  const style = STYLES[value] ?? 'bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]'
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium tracking-wide ${style}`}>
      {value}
    </span>
  )
}
