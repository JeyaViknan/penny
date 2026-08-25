import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type Variant = 'filled' | 'tinted' | 'plain' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

/**
 * Apple's three button weights, plus a destructive variant.
 *
 * - `filled`   — solid blue, one per screen: the single primary action.
 * - `tinted`   — blue on a light blue fill, for secondary actions.
 * - `plain`    — blue text with no container, for tertiary and navigation.
 *
 * Restraint is the point: if everything is a filled blue button, nothing is.
 */
const VARIANTS: Record<Variant, string> = {
  filled: 'bg-[var(--blue)] text-white active:bg-[var(--blue-pressed)] disabled:hover:bg-[var(--blue)]',
  tinted: 'bg-[var(--blue-tint)] text-[var(--blue)] active:bg-[rgba(0,105,224,0.18)]',
  plain: 'bg-transparent text-[var(--blue)] active:opacity-55',
  destructive: 'bg-[var(--red-tint)] text-[var(--red)] active:bg-[rgba(255,59,48,0.18)]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[15px] gap-1.5 rounded-[8px]',
  md: 'h-10 px-4 text-[16px] gap-2 rounded-[var(--radius-control)]',
  lg: 'h-[50px] px-5 text-[17px] gap-2 rounded-[14px]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconLeft?: ReactNode
  fullWidth?: boolean
  /** Renders a router link styled as a button, keeping native anchor behaviour. */
  asLink?: string
}

function classesFor(variant: Variant, size: Size, fullWidth?: boolean, className?: string) {
  return cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
    'transition-[background-color,transform,opacity] duration-[var(--duration-press)] ease-[var(--ease)]',
    // Feedback lands on pointer-down rather than on release. Waiting for the
    // click to acknowledge a press is what makes an interface feel dead.
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'tinted', size = 'md', loading, iconLeft, fullWidth, className, children, disabled, asLink, ...rest },
  ref,
) {
  const classes = classesFor(variant, size, fullWidth, className)

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
      {loading ? <Spinner className="h-4 w-4" /> : iconLeft}
      {children}
    </button>
  )
})
