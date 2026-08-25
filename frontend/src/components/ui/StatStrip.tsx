import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface Stat {
  label: string
  value: ReactNode
  /** One short line under the figure. Context, not commentary. */
  note?: ReactNode
}

/**
 * A row of figures separated by vertical rules.
 *
 * <p>This replaces three near-identical gradient cards. Cards were the wrong
 * container: each one drew a box around a single number, which spends a great
 * deal of screen on saying "here is a number" and none on letting the numbers be
 * compared with each other. Set on one baseline with rules between them, they
 * read as a set — which is what they are.
 *
 * <p>No icons, no coloured tiles, no trend arrows. A trend arrow implies a
 * comparison against a previous period, and Penny does not compute one; drawing
 * it anyway would be a decoration that looks like data.
 */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-md border border-line bg-surface',
        // Sized to the number of figures rather than always four, so a role
        // that sees three does not get a fourth empty cell.
        stats.length >= 4 ? 'lg:grid-cols-4' : stats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
        className,
      )}
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            'border-line px-4 py-3.5',
            // Rules between, never around: the container's own border already
            // closes the outside edge.
            index % 2 === 1 ? 'border-l' : '',
            index < 2 ? 'border-b lg:border-b-0' : '',
            'lg:border-b-0',
            index > 0 ? 'lg:border-l' : 'lg:border-l-0',
          )}
        >
          <dt className="t-col">{stat.label}</dt>
          <dd className="mt-1.5 text-ink">{stat.value}</dd>
          {stat.note && <p className="t-micro mt-1">{stat.note}</p>}
        </div>
      ))}
    </dl>
  )
}
