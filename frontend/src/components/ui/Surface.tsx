import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The single panel primitive. Every framed region in the app is this, so
 * radius, border weight and padding rhythm cannot drift between screens.
 */
export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
      <div className="min-w-0">
        <h2 className="t-heading text-[var(--text-primary)]">{title}</h2>
        {description && <p className="t-caption mt-0.5 text-[var(--text-tertiary)]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="t-title text-[var(--text-primary)]">{title}</h1>
        {description && <p className="t-body mt-1 text-[var(--text-secondary)]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

type Tone = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-inset)] text-[var(--text-secondary)]',
  positive: 'bg-[var(--positive-subtle)] text-[var(--positive)]',
  negative: 'bg-[var(--negative-subtle)] text-[var(--negative)]',
  warning: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  accent: 'bg-[var(--accent-subtle)] text-[var(--accent-fg)]',
}

/** Status vocabulary is centralised here so the same state never renders two ways. */
const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: 'positive',
  INACTIVE: 'warning',
  CLOSED: 'negative',
  CREDIT: 'positive',
  DEBIT: 'negative',
  DEPOSIT: 'positive',
  WITHDRAWAL: 'warning',
  TRANSFER: 'accent',
  ADMIN: 'accent',
  AUDITOR: 'neutral',
  TELLER: 'neutral',
  CUSTOMER: 'neutral',
}

export function Badge({ children, tone }: { children: string; tone?: Tone }) {
  const resolved = tone ?? STATUS_TONES[children] ?? 'neutral'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-xs)] px-1.5 py-0.5',
        'text-[0.6875rem] font-semibold uppercase tracking-[0.06em]',
        TONES[resolved],
      )}
    >
      {children}
    </span>
  )
}

/**
 * Skeletons mirror the shape of the content they stand in for, so the layout
 * does not jump when real data lands. A generic spinner cannot do that.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-inset)]',
        'motion-reduce:animate-none',
        className,
      )}
    />
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-inset)] text-[var(--text-tertiary)]">
          {icon}
        </div>
      )}
      <p className="t-subhead text-[var(--text-primary)]">{title}</p>
      <p className="t-caption mt-1.5 max-w-sm text-[var(--text-tertiary)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * Errors are phrased as something the reader can act on, and always offer a
 * way forward -- a dead end with a raw stack trace teaches people to distrust
 * the whole screen.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--negative)]/25 bg-[var(--negative-subtle)] px-4 py-3"
    >
      <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--negative)]" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M8 5v3.5M8 10.75v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="t-caption text-[var(--negative)]">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="t-caption shrink-0 font-medium text-[var(--negative)] underline underline-offset-2 hover:opacity-80"
        >
          Retry
        </button>
      )}
    </div>
  )
}
