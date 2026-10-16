import { useEffect } from 'react'
import { IconClose } from './Icons'

interface Shortcut {
  keys: string[]
  description: string
}

interface Group {
  title: string
  shortcuts: Shortcut[]
}

/**
 * The keyboard map.
 *
 * <p>The ledger has been keyboard-operable for a while -- arrow keys and j/k
 * step through rows, Enter opens one, slash focuses search -- and none of it was
 * discoverable. Shortcuts nobody knows about are indistinguishable from
 * shortcuts that do not exist, so the work was real and the benefit was
 * entirely theoretical.
 *
 * <p>Only bindings that are actually implemented are listed. A help panel that
 * promises a key which does nothing is worse than no help panel, because it
 * teaches people that the help is unreliable.
 */
const GROUPS: Group[] = [
  {
    title: 'Anywhere',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open the command palette' },
      { keys: ['?'], description: 'Show this list' },
      { keys: ['Esc'], description: 'Close a panel or dialog' },
    ],
  },
  {
    title: 'In a table',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Move between rows' },
      { keys: ['J', 'K'], description: 'Move between rows, without leaving the home row' },
      { keys: ['Enter'], description: 'Open the selected row' },
      { keys: ['Home', 'End'], description: 'Jump to the first or last row' },
    ],
  },
  {
    title: 'Filtering',
    shortcuts: [
      { keys: ['/'], description: 'Focus the search box' },
      { keys: ['Esc'], description: 'Close the detail panel and keep your place' },
    ],
  },
]

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="anim-fade absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="anim-modal relative w-full max-w-[460px] overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="t-section text-ink">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 rounded-md p-1.5 text-ink-2 hover:bg-hover hover:text-ink"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {GROUPS.map((group, index) => (
            <section key={group.title} className={index > 0 ? 'mt-5' : ''}>
              <h3 className="t-col mb-2">{group.title}</h3>
              <dl>
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-baseline justify-between gap-6 border-b border-line py-2 last:border-b-0"
                  >
                    <dt className="t-row min-w-0 text-ink-2">{shortcut.description}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="min-w-[22px] rounded-sm border border-line bg-sunken px-1.5 py-0.5 text-center text-[11px] text-ink"
                        >
                          {key}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
