import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountsApi, usersApi } from '../api/endpoints'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { formatMinorUnits } from '../lib/money'
import { titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'
import {
  IconAccounts,
  IconAudit,
  IconDashboard,
  IconHistory,
  IconSearch,
  IconTransfer,
  IconUsers,
} from './Icons'

interface Command {
  id: string
  /** What the row reads as. Matched against, so it carries the search terms. */
  label: string
  /** Right-aligned context: a balance, a role, an account holder. */
  detail?: string
  group: string
  icon: (props: { className?: string }) => React.ReactElement
  /** Extra text that should match but need not be shown. */
  keywords?: string
  run: () => void
}

/**
 * Jump anywhere, by typing.
 *
 * <p>This was argued against earlier in the project, on the grounds that a
 * five-item navigation does not need a search box to reach it. That was right
 * about navigation and wrong about the product. The useful entries here are not
 * the pages -- they are the three hundred accounts, reachable by number or by
 * holder, without going to a list and filtering it first. Looking up an account
 * by its last four digits is the single most repeated action a teller performs,
 * and a product built for daily use makes that one keystroke rather than three
 * screens.
 *
 * <p>Everything it offers is filtered by role before it is offered. A customer
 * does not see People or Audit here, for the same reason they do not see them
 * in the sidebar -- and the API would refuse regardless, so this is a courtesy
 * rather than the enforcement point.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const isStaff = user?.role !== 'CUSTOMER'
  const canAdminister = user?.role === 'ADMIN' || user?.role === 'AUDITOR'

  // Fetched only while open, and only once per opening. The palette is the one
  // place in the product that needs every account by name, and pulling that on
  // every page load to serve a panel most visits never open would be backwards.
  const accounts = useAsync(
    () => (open ? accountsApi.list() : Promise.resolve([])),
    [open],
  )
  const people = useAsync(
    () => (open && canAdminister ? usersApi.list() : Promise.resolve([])),
    [open, canAdminister],
  )

  const go = useCallback(
    (to: string) => {
      onClose()
      navigate(to)
    },
    [navigate, onClose],
  )

  const commands = useMemo<Command[]>(() => {
    const items: Command[] = [
      { id: 'nav-overview', label: 'Overview', group: 'Go to', icon: IconDashboard, run: () => go('/') },
      { id: 'nav-transactions', label: 'Transactions', group: 'Go to', icon: IconHistory, keywords: 'activity ledger history', run: () => go('/transactions') },
      { id: 'nav-accounts', label: 'Accounts', group: 'Go to', icon: IconAccounts, run: () => go('/accounts') },
    ]
    if (canAdminister) {
      items.push(
        { id: 'nav-people', label: 'People', group: 'Go to', icon: IconUsers, keywords: 'users staff roles access', run: () => go('/people') },
        { id: 'nav-audit', label: 'Audit', group: 'Go to', icon: IconAudit, keywords: 'trail log events', run: () => go('/audit') },
      )
    }
    if (user?.role !== 'AUDITOR') {
      items.push({
        id: 'action-transfer',
        label: 'Send money',
        group: 'Actions',
        icon: IconTransfer,
        keywords: 'transfer pay move',
        run: () => go('/transfer'),
      })
    }

    for (const account of accounts.data ?? []) {
      items.push({
        id: `account-${account.id}`,
        label: account.accountNumber,
        detail: `${account.ownerUsername ?? 'The institution'} · ${formatMinorUnits(account.balanceMinorUnits, account.currency)}`,
        group: 'Accounts',
        icon: IconAccounts,
        keywords: `${account.ownerUsername ?? ''} ${account.accountType}`,
        run: () => go(`/accounts/${account.id}`),
      })
    }

    for (const person of people.data ?? []) {
      items.push({
        id: `person-${person.id}`,
        label: person.username,
        detail: titleCase(person.role as Role),
        group: 'People',
        icon: IconUsers,
        keywords: person.email,
        run: () => go(`/people?focus=${person.id}`),
      })
    }

    return items
  }, [accounts.data, people.data, canAdminister, user?.role, go])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      // With no query the long lists are noise; show the places and actions.
      return commands.filter((c) => c.group === 'Go to' || c.group === 'Actions')
    }
    return commands
      .filter((c) => `${c.label} ${c.detail ?? ''} ${c.keywords ?? ''}`.toLowerCase().includes(term))
      .slice(0, 40)
  }, [commands, query])

  // A shrinking result set must not leave the highlight past the end.
  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(results.length - 1, 0)))
  }, [results.length])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    // Deferred rather than immediate, for the same reason the modal defers:
    // StrictMode remounts in development and detaches the focused node.
    const timer = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [open])

  // Keeps the highlighted row visible when the list is longer than the panel.
  useEffect(() => {
    listRef.current?.querySelectorAll('li')[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      results[active]?.run()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  let lastGroup = ''

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="anim-fade absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="anim-modal relative flex max-h-[60vh] w-full max-w-[560px] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-pop)]"
      >
        <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-line px-3.5">
          <IconSearch className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder={isStaff ? 'Search accounts, people and pages' : 'Search your accounts and pages'}
            aria-label="Search commands"
            className="h-full w-full bg-transparent text-[14px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <kbd className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-ink-3">
            esc
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-3.5 py-8 text-center text-[13px] text-ink-3">
            Nothing matches “{query.trim()}”.
          </p>
        ) : (
          <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-1.5">
            {results.map((command, index) => {
              const Icon = command.icon
              const showGroup = command.group !== lastGroup
              lastGroup = command.group
              return (
                <li key={command.id}>
                  {showGroup && (
                    <p className={cn('t-col px-3.5 pb-1', index === 0 ? 'pt-1' : 'pt-3')}>
                      {command.group}
                    </p>
                  )}
                  <button
                    type="button"
                    onMouseMove={() => setActive(index)}
                    onClick={() => command.run()}
                    className={cn(
                      'flex h-9 w-full items-center gap-2.5 px-3.5 text-left',
                      index === active ? 'bg-[var(--surface-active)]' : '',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink-3" />
                    <span className="t-row min-w-0 flex-1 truncate text-ink">{command.label}</span>
                    {command.detail && (
                      <span className="t-micro shrink-0 truncate pl-3">{command.detail}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex h-8 shrink-0 items-center gap-3 border-t border-line bg-sunken px-3.5">
          <Hint keys="↑↓" label="Navigate" />
          <Hint keys="↵" label="Open" />
          <span className="t-micro ml-auto">
            {accounts.loading ? 'Loading accounts…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>
    </div>
  )
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="rounded-sm border border-line bg-surface px-1 py-0.5 text-[10px] text-ink-2">
        {keys}
      </kbd>
      <span className="t-micro">{label}</span>
    </span>
  )
}
