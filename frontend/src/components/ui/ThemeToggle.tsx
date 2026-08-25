import { useTheme } from '../../theme/ThemeContext'
import { cn } from '../../lib/cn'

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
] as const

/**
 * A segmented control rather than a single toggle, because a two-state toggle
 * cannot express "follow the system" -- and hiding that option would silently
 * override a preference the person set at the OS level.
 */
export function ThemeToggle() {
  const { choice, setChoice } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = choice === option.value
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            onClick={() => setChoice(option.value)}
            className={cn(
              'rounded-[var(--radius-xs)] px-2 py-1 text-[0.6875rem] font-medium',
              'transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              'active:scale-[0.96]',
              active
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
