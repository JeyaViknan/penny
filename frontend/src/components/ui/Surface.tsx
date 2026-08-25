import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** A plain white card on the grouped background. */
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
    <div className={cn('rounded-[var(--radius-card)] bg-[var(--bg-elevated)]', padded && 'p-5', className)}>
      {children}
    </div>
  )
}

/**
 * The large-title header Apple uses at the top of a root screen. The title is
 * the biggest thing on the page and sits flush left, so the eye starts in the
 * same place on every screen.
 */
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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 px-4 sm:px-1">
      <div className="min-w-0">
        <h1 className="t-large-title text-[var(--label)]">{title}</h1>
        {description && <p className="t-subhead mt-1.5 text-[var(--label-secondary)]">{description}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </header>
  )
}

type Tone = 'neutral' | 'green' | 'red' | 'orange' | 'blue'

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--gray-tint)] text-[var(--label-secondary)]',
  green: 'bg-[var(--green-tint)] text-[var(--green)]',
  red: 'bg-[var(--red-tint)] text-[var(--red)]',
  orange: 'bg-[var(--orange-tint)] text-[var(--orange)]',
  blue: 'bg-[var(--blue-tint)] text-[var(--blue)]',
}

/** Status vocabulary lives here so a given state never renders two ways. */
const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: 'green',
  INACTIVE: 'orange',
  CLOSED: 'red',
  CREDIT: 'green',
  DEBIT: 'neutral',
  DEPOSIT: 'green',
  WITHDRAWAL: 'orange',
  TRANSFER: 'blue',
  ADMIN: 'blue',
  AUDITOR: 'neutral',
  TELLER: 'neutral',
  CUSTOMER: 'neutral',
  ENABLED: 'green',
  DISABLED: 'orange',
}

/** Capsule chip. Apple sets these in sentence case rather than shouting in caps. */
export function Badge({ children, tone }: { children: string; tone?: Tone }) {
  const resolved = tone ?? STATUS_TONES[children] ?? 'neutral'
  const label = children.charAt(0) + children.slice(1).toLowerCase()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-2 py-[3px] text-[12px] font-medium',
        TONES[resolved],
      )}
    >
      {label}
    </span>
  )
}

/** Mirrors the shape of the content it stands in for, so nothing jumps on load. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[6px] bg-[var(--fill-tertiary)] motion-reduce:animate-none', className)}
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
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--fill-quaternary)] text-[var(--label-quaternary)]">
          {icon}
        </div>
      )}
      <p className="t-headline text-[var(--label)]">{title}</p>
      <p className="t-subhead mt-1.5 max-w-sm text-[var(--label-secondary)]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/**
 * Errors are phrased as something a person can act on and always offer a way
 * forward. A dead end with a raw status code teaches people to distrust the
 * whole screen.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[var(--radius-card)] bg-[var(--red-tint)] px-4 py-3"
    >
      <svg viewBox="0 0 20 20" className="mt-px h-[18px] w-[18px] shrink-0 text-[var(--red-fill)]" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="M10 5.5v5.25M10 13.6v.6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <p className="t-subhead flex-1 text-[var(--red)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="t-subhead shrink-0 font-medium text-[var(--red)] active:opacity-55">
          Retry
        </button>
      )}
    </div>
  )
}
