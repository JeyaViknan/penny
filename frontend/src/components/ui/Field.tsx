import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const CONTROL_BASE =
  'w-full bg-[var(--surface-inset)] text-[var(--text-primary)] ' +
  'border border-[var(--border-default)] rounded-[var(--radius-md)] ' +
  'px-3 transition-[border-color,background-color,box-shadow] ' +
  'duration-[var(--duration-fast)] ease-[var(--ease-out)] ' +
  'placeholder:text-[var(--text-disabled)] ' +
  'hover:border-[var(--border-strong)] ' +
  'focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-subtle)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
  /** Renders the label for screen readers only, for visually self-evident controls. */
  hideLabel?: boolean
}

/**
 * Owns the label/hint/error triple so every form control in the app reports
 * problems the same way. Validation messages are wired with aria-describedby
 * rather than only being visually adjacent, so they are announced rather than
 * silently skipped.
 */
export function Field({ label, htmlFor, hint, error, children, hideLabel }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className={cn(
          't-caption block font-medium text-[var(--text-secondary)]',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="t-caption text-[var(--negative)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="t-caption text-[var(--text-tertiary)]">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  prefix?: string
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, prefix, className, id, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error || hint ? `${inputId}-desc` : undefined

  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error}>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="t-body pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL_BASE,
            'h-10 text-[0.9375rem]',
            prefix && 'pl-7',
            error && 'border-[var(--negative)] focus:border-[var(--negative)] focus:ring-[var(--negative-subtle)]',
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
  hint?: string
  error?: string
  children: ReactNode
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(
            CONTROL_BASE,
            'h-10 cursor-pointer appearance-none pr-9 text-[0.9375rem]',
            error && 'border-[var(--negative)]',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-tertiary)]"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </Field>
  )
})
