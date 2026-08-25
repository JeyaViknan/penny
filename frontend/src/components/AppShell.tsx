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

interface NavItem {
  to: string
  label: string
  icon: (props: { className?: string }) => React.ReactElement
  tone: string
  roles: Role[]
}

/**
 * Navigation in the shape of a macOS source list: a translucent sidebar, rows
 * with a rounded selection pill, and a small tinted glyph per item so sections
 * are recognisable by colour and shape before the label is read.
 *
 * Labels name their contents rather than using vague umbrellas -- "Overview"
 * over "Home", "Activity" over "Data" -- so people can predict what they will
 * find before they click.
 */
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: IconDashboard, tone: 'var(--blue)', roles: ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'] },
  { to: '/accounts', label: 'Accounts', icon: IconAccounts, tone: 'var(--indigo)', roles: ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'] },
  { to: '/activity', label: 'Activity', icon: IconHistory, tone: 'var(--green-fill)', roles: ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN'] },
  { to: '/transfer', label: 'Send money', icon: IconTransfer, tone: 'var(--orange-fill)', roles: ['CUSTOMER', 'TELLER', 'ADMIN'] },
  { to: '/people', label: 'People', icon: IconUsers, tone: 'var(--gray)', roles: ['ADMIN', 'AUDITOR'] },
  { to: '/audit', label: 'Audit trail', icon: IconAudit, tone: 'var(--red-fill)', roles: ['AUDITOR', 'ADMIN'] },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  // Navigating always dismisses the drawer; leaving it open over the page the
  // person just chose reads as broken.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  if (!user) return null
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-[var(--bg-grouped)]">
      {/* Compact top bar. Translucent, with content scrolling beneath it rather
          than being clipped by an opaque strip. */}
      <header className="sticky top-0 z-30 flex h-[52px] items-center gap-2 border-b border-[var(--separator)] bg-white/80 px-3 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          className="rounded-[8px] p-2 text-[var(--blue)] transition-opacity active:opacity-55"
        >
          <IconMenu className="h-[22px] w-[22px]" />
        </button>
        <Wordmark />
      </header>

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/25 motion-safe:animate-[fade-in_var(--duration-fast)_var(--ease)]"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <nav
            aria-label="Main"
            className="absolute inset-y-0 left-0 flex w-[17rem] flex-col bg-white shadow-[var(--shadow-sheet)] motion-safe:animate-[drawer-in_var(--duration-base)_var(--ease)]"
          >
            <div className="flex h-[52px] items-center justify-between border-b border-[var(--separator)] px-4">
              <Wordmark />
              <button
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation"
                className="rounded-[8px] p-1.5 text-[var(--blue)] active:opacity-55"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <NavList items={items} />
            <UserPanel username={user.username} role={user.role} onLogout={logout} />
          </nav>
        </div>
      )}

      {/* Desktop source list */}
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-20 hidden w-[var(--sidebar-width)] flex-col border-r border-[var(--separator)] bg-white/70 backdrop-blur-xl lg:flex"
      >
        <div className="flex h-[60px] items-center px-5">
          <Wordmark />
        </div>
        <NavList items={items} />
        <UserPanel username={user.username} role={user.role} onLogout={logout} />
      </nav>

      <main className="lg:pl-[var(--sidebar-width)]">
        <div key={location.pathname} className="view-enter mx-auto max-w-3xl py-7 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[var(--blue)] text-[14px] font-bold text-white">
        P
      </div>
      <span className="text-[17px] font-semibold tracking-[-0.022em] text-[var(--label)]">Penny</span>
    </div>
  )
}

function NavList({ items }: { items: NavItem[] }) {
  return (
    <div className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-2">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[15px]',
                'transition-colors duration-[var(--duration-press)]',
                isActive
                  ? 'bg-[var(--blue)] font-medium text-white'
                  : 'text-[var(--label)] hover:bg-[var(--fill-quaternary)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px]"
                  style={{ background: isActive ? 'rgba(255,255,255,0.24)' : item.tone }}
                >
                  <Icon className="h-[15px] w-[15px] text-white" />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}

function UserPanel({ username, role, onLogout }: { username: string; role: Role; onLogout: () => void }) {
  return (
    <div className="border-t border-[var(--separator)] p-2.5">
      <div className="flex items-center gap-2.5 px-1.5 py-1.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--fill-tertiary)] text-[14px] font-semibold uppercase text-[var(--label-secondary)]">
          {username.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="t-subhead truncate font-medium text-[var(--label)]">{username}</p>
          <p className="t-caption text-[var(--label-tertiary)]">{titleCase(role)}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="mt-1 flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[15px] text-[var(--blue)] transition-colors hover:bg-[var(--fill-quaternary)] active:opacity-55"
      >
        <IconLogout className="h-[18px] w-[18px]" />
        Sign out
      </button>
    </div>
  )
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}
