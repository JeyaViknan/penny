import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const CONTROL = cn(
  'w-full rounded-sm border border-line-strong bg-surface px-2.5 text-[13px] text-ink',
  'placeholder:text-ink-3 transition-colors duration-[var(--dur-fast)]',
  'hover:border-[var(--ink-faint)] disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3',
)

interface FieldWrapperProps {
  label: string
  hint?: string
  error?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/**
 * Label above control, hint or error below.
 *
 * <p>The id wiring is done here rather than left to call sites: a label that is
 * not programmatically associated with its input looks identical on screen and
 * is unusable with a screen reader, so it is exactly the kind of mistake that
 * survives review. Errors are announced, not merely coloured — colour alone is
 * not a message.
 */
export function Field({ label, hint, error, children }: FieldWrapperProps) {
  const id = useId()
  const messageId = error || hint ? `${id}-message` : undefined

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-ink-2">
        {label}
      </label>
      {children(id, messageId)}
      {(error || hint) && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn('mt-1.5 text-[12px]', error ? 'text-negative' : 'text-ink-3')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'h-[var(--h-control-lg)]', className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(CONTROL, 'h-[var(--h-control-lg)] appearance-none bg-right pr-8', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' stroke='%236e6e66' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 8l5 4.5L15 8'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
          backgroundSize: '16px 16px',
        }}
        {...rest}
      >
        {children}
      </select>
    )
  },
)

/**
 * The amount field on the transfer form. Large, tabular, and stripped of the
 * usual input chrome so the figure reads as the subject of the screen rather
 * than as one form field among several.
 */
export const AmountInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function AmountInput({ className, ...rest }, ref) {
    return (
      <div className="amount-well flex items-baseline gap-1.5 border-b border-line-strong pb-2 transition-colors">
        <span className="text-[20px] font-medium text-ink-3">$</span>
        <input
          ref={ref}
          inputMode="decimal"
          autoComplete="off"
          className={cn(
            'amount-field w-full border-0 bg-transparent p-0 text-[30px] font-semibold tracking-[-0.025em] text-ink',
            'placeholder:text-ink-faint focus:outline-none',
            className,
          )}
          {...rest}
        />
      </div>
    )
  },
)
