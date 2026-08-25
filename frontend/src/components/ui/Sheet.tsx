import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  /** Primary action rendered as the sheet's confirm button. */
  confirmLabel?: string
  onConfirm?: () => void
  confirmLoading?: boolean
  destructive?: boolean
  cancelLabel?: string
}

/**
 * A modal sheet, in Apple's presentation rather than a centred web dialog.
 *
 * <p>On small screens it rises from the bottom edge and is anchored there, with
 * a grabber at the top — the shape people already know from Wallet and Share.
 * On large screens it becomes a centred card, because a full-width bottom sheet
 * on a 27" display is absurd.
 *
 * <p>Either way it dims and recedes the page behind it, which is what separates
 * "this needs your attention now" from a panel you can ignore.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  confirmLoading,
  destructive,
  cancelLabel = 'Cancel',
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement
    panelRef.current
      ?.querySelector<HTMLElement>('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')
      ?.focus()

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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/25 motion-safe:animate-[fade-in_var(--duration-base)_var(--ease)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-[var(--bg-grouped)]',
          'rounded-t-[var(--radius-hero)] sm:max-w-[26rem] sm:rounded-[var(--radius-hero)]',
          'shadow-[var(--shadow-sheet)]',
          'motion-safe:animate-[sheet-up-mobile_var(--duration-sheet)_var(--ease)]',
          'sm:motion-safe:animate-[sheet-up_var(--duration-base)_var(--ease)]',
        )}
      >
        {/* Grabber: signals the sheet is dismissable, and only on the presentation
            where dragging it is the natural gesture. */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <div className="h-[5px] w-9 rounded-full bg-[var(--fill-primary)]" />
        </div>

        <div className="px-5 pb-4 pt-5 text-center">
          <h2 id="sheet-title" className="t-title3 text-[var(--label)]">
            {title}
          </h2>
          {description && <p className="t-subhead mt-2 text-[var(--label-secondary)]">{description}</p>}
        </div>

        {children && <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{children}</div>}

        <div className="flex flex-col gap-2 px-4 pb-5 pt-3">
          {onConfirm && (
            <Button
              variant={destructive ? 'destructive' : 'filled'}
              size="lg"
              fullWidth
              onClick={onConfirm}
              loading={confirmLoading}
            >
              {confirmLabel}
            </Button>
          )}
          <Button variant="plain" size="lg" fullWidth onClick={onClose} disabled={confirmLoading}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Reserved for genuinely irreversible actions. Confirming everything trains
 * people to tap through without reading, which makes the dialog worthless
 * exactly when it matters.
 */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      confirmLoading={loading}
      destructive={destructive}
    />
  )
}
