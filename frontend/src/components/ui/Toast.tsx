import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-[var(--positive)]/30 text-[var(--positive)]',
  error: 'border-[var(--negative)]/30 text-[var(--negative)]',
  info: 'border-[var(--border-strong)] text-[var(--text-secondary)]',
}

const AUTO_DISMISS_MS = 4000

/**
 * Confirmation that stays out of the way.
 *
 * <p>Toasts are for completion feedback the user does not have to act on --
 * anything requiring a decision belongs in a dialog, and anything the user can
 * already see the result of (a balance updating on screen) needs no toast at
 * all. Over-notifying trains people to ignore notifications.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, tone, message }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), AUTO_DISMISS_MS)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Polite: a completion message should not interrupt whatever the
        // screen reader is currently announcing.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-2.5',
              'bg-[var(--chrome-bg)] shadow-[var(--shadow-lg)] backdrop-blur-[var(--chrome-blur)]',
              'motion-safe:animate-[toast-in_var(--duration-base)_var(--ease-out)]',
              TONE_STYLES[toast.tone],
            )}
          >
            <ToastIcon tone={toast.tone} />
            <p className="t-caption flex-1 text-[var(--text-primary)]">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {tone === 'success' ? (
        <path d="m5.25 8.25 1.9 1.9 3.6-3.9" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 4.75v3.75M8 10.9v.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      )}
    </svg>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
