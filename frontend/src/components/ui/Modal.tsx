import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
}

/**
 * A blocking, focused task. It pairs the surface with a dimming scrim and
 * pushes the page behind it back, which is what separates "this needs your
 * attention" from a parallel panel that should not interrupt flow.
 *
 * <p>Enter and exit run along the same path -- it grows in from slightly small
 * and low, and leaves the way it came -- so the surface reads as one object
 * arriving and departing rather than two unrelated fades.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'sm' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement
    // Focus moves into the dialog so keyboard users are not left behind on the
    // page underneath, and is handed back to the trigger on close.
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    firstFocusable?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px] motion-safe:animate-[fade-in_var(--duration-base)_var(--ease-out)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        className={cn(
          'relative w-full rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)]',
          'border border-[var(--border-default)] bg-[var(--surface-overlay)] shadow-[var(--shadow-xl)]',
          'motion-safe:animate-[modal-in_var(--duration-base)_var(--ease-out)]',
          size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg',
        )}
      >
        <div className="px-5 pb-4 pt-5">
          <h2 id="modal-title" className="t-heading text-[var(--text-primary)]">
            {title}
          </h2>
          {description && (
            <p id="modal-description" className="t-body mt-1.5 text-[var(--text-secondary)]">
              {description}
            </p>
          )}
        </div>
        {children && <div className="px-5 pb-4">{children}</div>}
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-3.5">
          {footer ?? (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reserved for genuinely irreversible actions. Confirming everything trains
 * people to click through without reading, which makes the dialog worthless
 * exactly when it matters.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
