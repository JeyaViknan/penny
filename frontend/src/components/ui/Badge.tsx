import { cn } from '../../lib/cn'

type Tone = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-tint text-ink-2',
  positive: 'bg-positive-tint text-positive',
  negative: 'bg-negative-tint text-negative',
  warning: 'bg-warning-tint text-warning',
  accent: 'bg-accent-tint text-accent',
}

/**
 * A 20px label. Sentence case, low saturation, square-ish corners.
 *
 * <p>Restraint matters more here than anywhere: a badge is a label, and a table
 * where every row carries a bright pill has turned a status column into
 * decoration. Neutral is the default on purpose — a status only earns colour
 * when it means something is different from normal.
 */
export function Badge({ tone = 'neutral', children, className }: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-sm px-1.5 text-[11px] font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
