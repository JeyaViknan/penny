import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', roles: ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'] },
  { to: '/accounts', label: 'Accounts', roles: ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'] },
  { to: '/transfer', label: 'Transfer Money', roles: ['CUSTOMER', 'TELLER', 'ADMIN'] },
  { to: '/audit', label: 'Audit Log', roles: ['AUDITOR', 'ADMIN'] },
]

export function AppShell() {
  const { user, logout } = useAuth()
  if (!user) return null

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  return (
    <div className="flex min-h-screen bg-[var(--color-surface-0)] text-[var(--color-text-primary)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-accent-muted)] font-mono text-sm font-semibold text-[var(--color-accent)]">
            LL
          </div>
          <span className="text-sm font-semibold tracking-wide text-[var(--color-text-primary)]">LedgerLite</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-hover)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--color-border)] px-4 py-4">
          <div className="mb-2 truncate text-sm text-[var(--color-text-primary)]">{user.username}</div>
          <div className="mb-3 inline-block rounded bg-[var(--color-surface-3)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
            {user.role}
          </div>
          <button
            onClick={logout}
            className="block w-full rounded border border-[var(--color-border)] px-3 py-1.5 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
