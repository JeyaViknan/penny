import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

/**
 * Four weights. The primary one is ink, not blue.
 *
 * <p>That is the single highest-signal decision in this design system. A
 * saturated blue button on every screen is what makes an interface read as
 * generic, because it is what every template ships with. Ink reads as
 * deliberate, and it leaves blue free to mean exactly one thing: this is a
 * link, or this has focus.
 *
 * - `primary`   ink fill, white label. One per screen.
 * - `secondary` surface with a border. The default for most actions.
 * - `ghost`     no container. Toolbars, table rows, anywhere a border would add clutter.
 * - `danger`    ink-weight structure, negative colour. Closing an account, and little else.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ink text-ink-inverse hover:bg-[#000] disabled:hover:bg-ink',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-hover disabled:hover:bg-surface',
  ghost:
    'bg-transparent text-ink-2 hover:bg-hover hover:text-ink',
  danger:
    'bg-negative text-ink-inverse hover:bg-[#9a1e14] disabled:hover:bg-negative',
}

const SIZES: Record<Size, string> = {
  sm: 'h-[var(--h-control-sm)] px-2.5 text-[12px] gap-1.5',
  md: 'h-[var(--h-control)] px-3 text-[13px] gap-1.5',
  lg: 'h-[var(--h-control-lg)] px-4 text-[13px] gap-2',
}

const BASE = cn(
  'inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium',
  'transition-colors duration-[var(--dur-fast)]',
  // A one-pixel press rather than a scale transform. Scaling a 32px control
  // next to a 40px table row makes the whole row look like it flexed.
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
)

interface CommonProps {
  variant?: Variant
  size?: Size
  iconLeft?: ReactNode
  fullWidth?: boolean
  className?: string
  children?: ReactNode
}

interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> {
  loading?: boolean
}

function classesFor({ variant = 'secondary', size = 'md', fullWidth, className }: CommonProps) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, iconLeft, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classesFor({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : iconLeft}
      {children}
    </button>
  )
})

interface ButtonLinkProps extends CommonProps, Omit<LinkProps, keyof CommonProps> {}

/**
 * A router link that looks like a button.
 *
 * <p>This is a separate component rather than an `asLink` prop on Button, which
 * is how it was previously done. That prop silently dropped `ref`, `disabled`,
 * `loading` and every handler, so a link-button could not be disabled and could
 * not show a spinner while looking exactly like one that could. Splitting the
 * two makes the difference a type error instead of a surprise: if an action can
 * be pending or disabled it is a Button, and if it navigates it is a ButtonLink.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant, size, iconLeft, fullWidth, className, children, ...rest },
  ref,
) {
  return (
    <Link ref={ref} className={classesFor({ variant, size, fullWidth, className })} {...rest}>
      {iconLeft}
      {children}
    </Link>
  )
})
