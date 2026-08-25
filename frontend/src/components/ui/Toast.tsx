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
const AUTO_DISMISS_MS = 3600

/**
 * Completion feedback that stays out of the way, in the shape of Apple's
 * transient banners: a small capsule that appears near the top on desktop and
 * bottom on mobile, then leaves on its own.
 *
 * <p>Toasts are only for outcomes the person does not have to act on. Anything
 * requiring a decision belongs in a sheet, and anything whose result is already
 * visible on screen needs no toast at all — over-notifying trains people to
 * ignore notifications.
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
        // Polite: a completion message should not interrupt whatever a screen
        // reader is currently announcing.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:top-5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-[var(--radius-pill)]',
              'bg-white/85 py-2.5 pl-3 pr-4 shadow-[var(--shadow-raised)] backdrop-blur-xl',
              'motion-safe:animate-[sheet-up_var(--duration-base)_var(--ease)]',
            )}
          >
            <ToastIcon tone={toast.tone} />
            <p className="t-subhead text-[var(--label)]">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  const fill =
    tone === 'success' ? 'var(--green-fill)' : tone === 'error' ? 'var(--red-fill)' : 'var(--gray)'
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill={fill} />
      {tone === 'success' ? (
        <path
          d="m6 10.4 2.6 2.6L14.2 7.4"
          fill="none"
          stroke="white"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path d="M10 5.4v5.4M10 13.6v.7" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
      )}
    </svg>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
