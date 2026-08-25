import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/**
 * Form controls in Apple's idiom: no outlines. An input reads as recessed
 * because it sits on a translucent grey fill, and gains a blue ring only while
 * focused. Borders around every field make a form look like a web form; fills
 * make it look like Settings.
 */
const CONTROL =
  'w-full rounded-[var(--radius-control)] bg-[var(--fill-quaternary)] px-3.5 text-[17px] ' +
  'text-[var(--label)] placeholder:text-[var(--label-quaternary)] ' +
  'transition-[background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease)] ' +
  'focus:bg-white focus:outline-none focus:shadow-[0_0_0_3.5px_rgba(0,105,224,0.34)] ' +
  'disabled:opacity-45 disabled:cursor-not-allowed'

interface FieldShellProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string
  children: ReactNode
  hideLabel?: boolean
}

export function Field({ label, htmlFor, hint, error, children, hideLabel }: FieldShellProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className={cn('t-footnote mb-1.5 block font-medium text-[var(--label-secondary)]', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="t-footnote mt-1.5 text-[var(--red)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="t-footnote mt-1.5 text-[var(--label-tertiary)]">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  error?: string
  prefix?: string
  hideLabel?: boolean
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, prefix, className, id, hideLabel, ...rest },
  ref,
) {
  const generated = useId()
  const inputId = id ?? generated

  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} hideLabel={hideLabel}>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="t-body pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--label-tertiary)]"
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL,
            'h-[44px]',
            prefix && 'pl-8',
            error && 'shadow-[0_0_0_2px_rgba(255,59,48,0.5)] focus:shadow-[0_0_0_3.5px_rgba(255,59,48,0.35)]',
            className,
          )}
          {...rest}
        />
      </div>
    </Field>
  )
})

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const generated = useId()
  const selectId = id ?? generated

  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL,
            'h-[44px] cursor-pointer appearance-none pr-10',
            error && 'shadow-[0_0_0_2px_rgba(255,59,48,0.5)]',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        {/* The up/down chevron pair is the macOS pop-up button affordance, and
            signals "choose one of these" rather than "expand a menu". */}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 20"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-2.5 -translate-y-1/2 text-[var(--label-tertiary)]"
        >
          <path d="M2 8l4-4 4 4M2 12l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  )
})

/**
 * The oversized amount field used on money-entry screens, where the number is
 * the whole point of the view and everything else is secondary.
 */
export function AmountInput({
  value,
  onChange,
  error,
  hint,
  autoFocus,
}: {
  value: string
  onChange: (next: string) => void
  error?: string
  hint?: ReactNode
  autoFocus?: boolean
}) {
  const id = useId()
  return (
    <div className="text-center">
      <label htmlFor={id} className="sr-only">
        Amount
      </label>
      <div className="flex items-center justify-center">
        <span className="t-money text-[40px] font-semibold text-[var(--label-tertiary)]">$</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder="0"
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          className={cn(
            'amount-field t-money w-[6.5ch] bg-transparent text-[52px] font-semibold outline-none',
            'placeholder:text-[var(--label-quaternary)]',
            error ? 'text-[var(--red)]' : 'text-[var(--label)]',
          )}
        />
      </div>
      {error ? (
        <p className="t-footnote mt-1 text-[var(--red)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="t-footnote mt-1 text-[var(--label-tertiary)]">{hint}</p>
      ) : null}
    </div>
  )
}
