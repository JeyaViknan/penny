import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Width = 'wide' | 'measure'

interface PageLayoutProps {
  title: string
  /** One sentence at most. Omit it rather than restating the title in other words. */
  description?: string
  /** Buttons aligned to the title. Primary action last, as it is in every dialog. */
  actions?: ReactNode
  /** Filters and search, pinned under the top bar while the content scrolls. */
  toolbar?: ReactNode
  /**
   * `wide` fills the viewport up to 1600px -- for tables, which are worth more
   * the more columns are visible at once. `measure` caps at 600px -- for forms
   * and prose, where a line that runs the width of a monitor is unreadable.
   *
   * The old shell applied one 768px max-width to every route, which meant a
   * six-column audit table and a single-field form were allotted identical
   * space. Neither was well served.
   */
  width?: Width
  children: ReactNode
}

/**
 * The frame every page sits in.
 *
 * <p>It owns the page gutter. That sounds trivial and was not: the previous
 * shell gave its content area no horizontal padding, so all nine pages
 * compensated individually with `px-4 sm:px-0`, twenty-one times in total, and
 * three of them expressed it differently. Any rule repeated at every call site
 * is a rule that will eventually be repeated wrongly.
 */
export function PageLayout({
  title,
  description,
  actions,
  toolbar,
  width = 'wide',
  children,
}: PageLayoutProps) {
  return (
    <div className="pb-16">
      <div
        className={cn(
          'mx-auto px-[var(--gutter)]',
          width === 'wide' ? 'max-w-[var(--w-content-max)]' : 'max-w-[var(--w-measure)]',
        )}
      >
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-7 pb-5">
          <div className="min-w-0">
            <h1 className="t-page text-ink">{title}</h1>
            {description && (
              <p className="t-body mt-1.5 max-w-[62ch] text-ink-2">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      </div>

      {/* The toolbar spans the full width and carries the rule that separates
          the page header from the content, so filters read as attached to the
          data rather than floating between the two. */}
      {toolbar && (
        <div className="sticky top-[var(--h-topbar)] z-20 border-y border-line bg-canvas/95 backdrop-blur-sm">
          <div
            className={cn(
              'mx-auto flex h-[var(--h-toolbar)] items-center gap-2 px-[var(--gutter)]',
              width === 'wide' ? 'max-w-[var(--w-content-max)]' : 'max-w-[var(--w-measure)]',
            )}
          >
            {toolbar}
          </div>
        </div>
      )}

      <div
        className={cn(
          'mx-auto px-[var(--gutter)]',
          toolbar ? 'pt-6' : '',
          width === 'wide' ? 'max-w-[var(--w-content-max)]' : 'max-w-[var(--w-measure)]',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * A titled block within a page. The rule above the heading is what separates
 * sections here -- not a card, not a shadow, not a gap large enough to read as
 * an accident.
 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mb-8', className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="t-section text-ink">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
