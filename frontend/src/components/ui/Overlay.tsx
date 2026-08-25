import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconClose } from '../Icons'
import { Button } from './Button'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Returns focus to whatever had it before the overlay opened. */
function useFocusRestore(open: boolean) {
  const previous = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) {
      previous.current = document.activeElement as HTMLElement
      return
    }
    previous.current?.focus?.()
  }, [open])
}

/**
 * A right-hand detail panel. Deliberately <b>not</b> modal.
 *
 * <p>This is the difference that makes the ledger usable. Opening a transaction
 * must not cost you your position in the list, and it must not stop you moving
 * to the next row — so the drawer does not trap focus, does not lock scrolling,
 * and leaves focus on the table row you opened it from. Arrow keys keep
 * stepping, and the drawer updates to follow. Tab reaches into it when you
 * actually want its controls; Escape closes it and hands focus back.
 *
 * <p>Below 1024px it covers the page, and there it does dim the background,
 * because at that width it genuinely is the whole screen.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useFocusRestore(open)

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="anim-fade fixed inset-0 z-30 bg-ink/20 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="complementary"
        aria-label={title}
        className={cn(
          'anim-drawer fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-surface sm:w-[420px] xl:w-[480px]',
          'shadow-[var(--shadow-drawer)]',
        )}
      >
        <header className="flex h-[var(--h-topbar)] shrink-0 items-start justify-between gap-3 border-b border-line px-4 pt-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold text-ink">{title}</h2>
            {subtitle && <div className="t-micro truncate">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="-mr-1.5 rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-3">
            {footer}
          </div>
        )}
      </aside>
    </>
  )
}

/**
 * A centred dialog that genuinely interrupts: it traps focus, locks the page
 * behind it and dims it. Reserved for the two cases that deserve interruption —
 * confirming something irreversible, and a short creation form.
 *
 * <p>The previous implementation hard-coded `aria-labelledby="sheet-title"`, so
 * two mounted at once would both point at the first one's heading. The id is
 * derived per instance here.
 */
export function Modal({
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
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  confirmLabel?: string
  onConfirm?: () => void
  confirmLoading?: boolean
  destructive?: boolean
  cancelLabel?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusRestore(open)

  useEffect(() => {
    if (!open) return

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
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
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="anim-fade absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="anim-modal relative w-full max-w-md rounded-lg border border-line bg-surface shadow-[var(--shadow-pop)]"
      >
        <div className="px-5 pt-5 pb-4">
          <h2 id={titleId} className="t-section text-ink">
            {title}
          </h2>
          {description && <p className="t-body mt-1.5 text-ink-2">{description}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <Button onClick={onClose} size="lg">
            {cancelLabel}
          </Button>
          {confirmLabel && onConfirm && (
            <Button
              variant={destructive ? 'danger' : 'primary'}
              size="lg"
              onClick={onConfirm}
              loading={confirmLoading}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
