import type { ReactNode } from 'react'

export function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">{message}</p>
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded border border-[var(--color-negative)]/30 bg-[var(--color-negative-muted)] px-4 py-2.5 text-sm text-[var(--color-negative)]">
      {message}
    </div>
  )
}
