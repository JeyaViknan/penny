import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import {
  IconAccounts,
  IconAudit,
  IconClose,
  IconDashboard,
  IconHistory,
  IconLogout,
  IconMenu,
  IconTransfer,
  IconUsers,
} from './Icons'
import { ThemeToggle } from './ui/ThemeToggle'

interface NavItem {
  to: string
  label: string
  icon: (props: { className?: string }) => React.ReactElement
  roles: Role[]
}

/**
 * Nav labels name their contents rather than using vague umbrellas -- "Overview"
 * over "Home", "Activity" over "Data". Specific names let people predict what
 * they will find before they click.
 */
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: IconDashboard, roles: ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'] },
  { to: '/accounts', label: 'Accounts', icon: IconAccounts, roles: ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'] },
  { to: '/activity', label: 'Activity', icon: IconHistory, roles: ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'] },
  { to: '/transfer', label: 'Send money', icon: IconTransfer, roles: ['CUSTOMER', 'TELLER', 'ADMIN'] },
  { to: '/people', label: 'People', icon: IconUsers, roles: ['ADMIN', 'AUDITOR'] },
  { to: '/audit', label: 'Audit trail', icon: IconAudit, roles: ['AUDITOR', 'ADMIN'] },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Navigating should always dismiss the mobile drawer -- leaving it open over
  // the page the user just chose is a small thing that reads as broken.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  if (!user) return null
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)]">
      {/* Mobile top bar: translucent, with content scrolling beneath it. */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border-subtle)] px-4 lg:hidden"
        style={{ background: 'var(--chrome-bg)', backdropFilter: 'var(--chrome-blur)' }}
      >
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
          className="-ml-1.5 rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-95"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <Wordmark />
      </header>

      {/* Mobile drawer. It enters from the left and leaves to the left, so the
          panel keeps a consistent home rather than appearing to teleport. */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-[var(--scrim)] motion-safe:animate-[fade-in_var(--duration-fast)_var(--ease-out)]"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <nav
            aria-label="Main"
            className="absolute inset-y-0 left-0 flex w-[17rem] flex-col border-r border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-xl)] motion-safe:animate-[drawer-in_var(--duration-base)_var(--ease-out)]"
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] px-4">
              <Wordmark />
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] active:scale-95"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <NavList items={visibleItems} />
            <UserPanel username={user.username} role={user.role} onLogout={logout} />
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-20 hidden w-[var(--sidebar-width)] flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] lg:flex"
      >
        <div className="flex h-16 items-center px-5">
          <Wordmark />
        </div>
        <NavList items={visibleItems} />
        <UserPanel username={user.username} role={user.role} onLogout={logout} />
      </nav>

      <main className="lg:pl-[var(--sidebar-width)]">
        <div key={location.pathname} className="view-enter mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[0.6875rem] font-bold tracking-tight text-[var(--accent-text)]">
        P
      </div>
      <span className="t-subhead text-[var(--text-primary)]">Penny</span>
    </div>
  )
}

function NavList({ items }: { items: NavItem[] }) {
  return (
    <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2',
                'text-[0.875rem] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                isActive
                  ? 'bg-[var(--accent-subtle)] font-medium text-[var(--accent-fg)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* A left rail marks the current section without relying on
                    colour alone, which matters for colour-blind users. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]',
                    'transition-opacity duration-[var(--duration-fast)]',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
                {item.label}
              </>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}

function UserPanel({
  username,
  role,
  onLogout,
}: {
  username: string
  role: Role
  onLogout: () => void
}) {
  return (
    <div className="border-t border-[var(--border-subtle)] p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="t-caption truncate font-medium text-[var(--text-primary)]">{username}</p>
          <p className="t-label mt-0.5 text-[var(--text-tertiary)]">{role}</p>
        </div>
      </div>
      <div className="mb-2 px-1">
        <ThemeToggle />
      </div>
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[0.8125rem] text-[var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-[0.98]"
      >
        <IconLogout className="h-4 w-4" />
        Sign out
      </button>
    </div>
  )
}
