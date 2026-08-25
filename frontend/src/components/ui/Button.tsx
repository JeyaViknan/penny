import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] ' +
    'shadow-[var(--shadow-sm)] disabled:hover:bg-[var(--accent)]',
  secondary:
    'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-default)] ' +
    'hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
  danger: 'bg-[var(--negative)] text-white hover:brightness-110 shadow-[var(--shadow-sm)]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-9 px-4 text-[0.875rem] gap-2 rounded-[var(--radius-md)]',
  lg: 'h-11 px-5 text-[0.9375rem] gap-2 rounded-[var(--radius-md)]',
}

/**
 * Press feedback fires on `:active` -- that is, on pointer-down rather than on
 * click. Waiting for the release to acknowledge a press is the single thing
 * that makes an interface feel dead, and 100ms is short enough that the scale
 * reads as the control yielding rather than as an animation playing.
 */
function buttonClasses(variant: Variant, size: Size, fullWidth?: boolean, className?: string) {
  return cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
    'transition-[background-color,border-color,color,transform,opacity]',
    'duration-[var(--duration-press)] ease-[var(--ease-out)]',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconLeft?: ReactNode
  fullWidth?: boolean
  /**
   * Renders a router link styled as a button. Navigation must stay an anchor
   * so it keeps native affordances -- middle-click, open in new tab, and the
   * link semantics screen readers rely on.
   */
  asLink?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, iconLeft, fullWidth, className, children, disabled, asLink, ...rest },
  ref,
) {
  const classes = buttonClasses(variant, size, fullWidth, className)

  if (asLink) {
    return (
      <Link to={asLink} className={classes}>
        {iconLeft}
        {children}
      </Link>
    )
  }

  return (
    <button ref={ref} disabled={disabled || loading} className={classes} {...rest}>
      {loading ? <Spinner className="h-3.5 w-3.5" /> : iconLeft}
      {children}
    </button>
  )
})
