import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

/**
 * A section of an inset grouped list: an optional uppercase header, a white
 * rounded container of rows, and optional footer text beneath it.
 *
 * <p>This is the primary structural unit of the interface, the way it is in
 * Wallet and Settings. Content lives on white cards floating over a grey page
 * rather than inside bordered boxes on a white page -- that inversion is most
 * of what makes a layout read as Apple's rather than as a generic dashboard.
 */
export function ListSection({
  header,
  footer,
  action,
  children,
  className,
}: {
  header?: string
  footer?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mb-8', className)}>
      {(header || action) && (
        <div className="mb-2 flex items-end justify-between gap-4 px-4 sm:px-1">
          {header && <h2 className="t-section">{header}</h2>}
          {action}
        </div>
      )}
      {/* iOS insets grouped lists from the screen edge rather than running them
          full-bleed; the margin is what makes the card read as a card. */}
      <div className="mx-4 sm:mx-0">
        <div className="list-group">{children}</div>
      </div>
      {footer && <p className="t-footnote mt-2 px-4 text-[var(--label-tertiary)] sm:px-1">{footer}</p>}
    </section>
  )
}

interface ListRowProps {
  /** Leading glyph, normally a coloured circle. Sets the separator inset. */
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Right-aligned value, typically an amount or a status. */
  value?: ReactNode
  valueSubtitle?: ReactNode
  to?: string
  onClick?: () => void
  /** Shows the drill-in chevron. Implied by `to`. */
  chevron?: boolean
  destructive?: boolean
  className?: string
}

/**
 * One row. Rows separate with a hairline that starts where the row's text
 * starts rather than at the card edge -- the inset is the detail that makes a
 * list read as iOS instead of as a striped table.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  value,
  valueSubtitle,
  to,
  onClick,
  chevron,
  destructive,
  className,
}: ListRowProps) {
  const interactive = Boolean(to || onClick)
  const showChevron = chevron ?? Boolean(to)

  const body = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            't-body truncate',
            destructive ? 'text-[var(--red)]' : 'text-[var(--label)]',
          )}
        >
          {title}
        </div>
        {subtitle && <div className="t-subhead mt-0.5 truncate text-[var(--label-secondary)]">{subtitle}</div>}
      </div>
      {(value || valueSubtitle) && (
        <div className="shrink-0 text-right">
          {value && <div className="t-body text-[var(--label)]">{value}</div>}
          {valueSubtitle && <div className="t-footnote mt-0.5 text-[var(--label-tertiary)]">{valueSubtitle}</div>}
        </div>
      )}
      {showChevron && <Chevron />}
    </>
  )

  const classes = cn(
    'list-row list-row-inset relative flex w-full items-center gap-3 px-4 text-left',
    // 44px is Apple's minimum comfortable target; rows with a subtitle grow.
    'min-h-[44px] py-2.5',
    interactive && 'transition-colors duration-[var(--duration-press)] active:bg-[var(--fill-quaternary)] hover:bg-[rgba(0,0,0,0.02)]',
    className,
  )

  // The inset is driven by the leading glyph's width, so lists with and without
  // icons both align their separators to the text.
  const style = { '--row-inset': leading ? '60px' : '16px' } as React.CSSProperties

  if (to) {
    return (
      <Link to={to} className={classes} style={style}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} style={style}>
        {body}
      </button>
    )
  }
  return (
    <div className={classes} style={style}>
      {body}
    </div>
  )
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 7 12"
      aria-hidden="true"
      className="ml-0.5 h-3 w-[7px] shrink-0 text-[var(--label-quaternary)]"
    >
      <path d="M1 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type GlyphTone = 'blue' | 'green' | 'red' | 'orange' | 'gray' | 'indigo'

const GLYPH_TONES: Record<GlyphTone, string> = {
  blue: 'bg-[var(--blue)]',
  green: 'bg-[var(--green-fill)]',
  red: 'bg-[var(--red-fill)]',
  orange: 'bg-[var(--orange-fill)]',
  indigo: 'bg-[var(--indigo)]',
  gray: 'bg-[var(--gray)]',
}

/**
 * The filled circle that leads a row. Apple uses these to make a long list
 * scannable by shape and colour before the text is read at all.
 */
export function Glyph({ tone = 'gray', children, size = 'md' }: { tone?: GlyphTone; children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white',
        size === 'md' ? 'h-8 w-8' : 'h-7 w-7',
        GLYPH_TONES[tone],
      )}
    >
      {children}
    </div>
  )
}

/** Row used inside a form sheet: a label on the left, a control filling the rest. */
export function FormRow({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="list-row list-row-inset relative flex min-h-[44px] items-center gap-3 px-4 py-2">
      <label htmlFor={htmlFor} className="t-body w-28 shrink-0 text-[var(--label)]">
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
