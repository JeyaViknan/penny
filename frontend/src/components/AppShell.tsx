import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ledgerApi } from '../api/endpoints'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { cn } from '../lib/cn'
import { titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'
import {
  IconAccounts,
  IconAudit,
  IconClose,
  IconDashboard,
  IconHistory,
  IconLogout,
  IconMenu,
  IconUsers,
} from './Icons'

interface NavItem {
  to: string
  label: string
  icon: (props: { className?: string }) => React.ReactElement
  roles: Role[]
}

interface NavGroup {
  /** Undefined for the first group, which needs no label to be understood. */
  label?: string
  items: NavItem[]
}

const ALL: Role[] = ['CUSTOMER', 'TELLER', 'AUDITOR', 'ADMIN']

/**
 * Two labelled groups rather than six flat items.
 *
 * <p>Flat lists give no sense of a system's shape, and this one has an obvious
 * shape: there is the money, and there is the administration of the money.
 * Separating them also means a customer's shorter nav reads as complete rather
 * than as the staff nav with things taken away.
 *
 * <p>"Send money" is deliberately absent. It is an action, not a place, and as
 * a nav item it forced a destination on something that should be reachable from
 * anywhere -- above all from an account you are already looking at. It lives in
 * the top bar instead.
 */
const NAV: NavGroup[] = [
  {
    items: [{ to: '/', label: 'Overview', icon: IconDashboard, roles: ALL }],
  },
  {
    label: 'Ledger',
    items: [
      { to: '/transactions', label: 'Transactions', icon: IconHistory, roles: ALL },
      { to: '/accounts', label: 'Accounts', icon: IconAccounts, roles: ALL },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/people', label: 'People', icon: IconUsers, roles: ['ADMIN', 'AUDITOR'] },
      { to: '/audit', label: 'Audit', icon: IconAudit, roles: ['ADMIN', 'AUDITOR'] },
    ],
  },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  // Scroll restoration. Without this a router navigation keeps the previous
  // page's scroll offset, so arriving at a page from halfway down a long table
  // drops you into the middle of the new one.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (!user) return null

  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0)

  const canSendMoney = user.role !== 'AUDITOR'

  return (
    <div className="min-h-screen bg-canvas">
      {/* Keyboard users reach the content without tabbing the whole sidebar. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-ink-inverse"
      >
        Skip to content
      </a>

      <Sidebar groups={groups} username={user.username} role={user.role} onLogout={logout} />

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="anim-fade absolute inset-0 bg-ink/25"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[268px] bg-surface shadow-[var(--shadow-pop)]">
            <Sidebar
              groups={groups}
              username={user.username}
              role={user.role}
              onLogout={logout}
              variant="drawer"
              onClose={() => setNavOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-[var(--w-rail)] xl:pl-[var(--w-sidebar)]">
        <TopBar
          canSendMoney={canSendMoney}
          onOpenNav={() => setNavOpen(true)}
          navOpen={navOpen}
        />
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * The top bar carries the one action that belongs on every screen and the
 * signed-in identity. It is 52px and it does not move -- the frame landing in
 * the same place on every page is what lets someone stop looking for it.
 */
function TopBar({
  canSendMoney,
  onOpenNav,
  navOpen,
}: {
  canSendMoney: boolean
  onOpenNav: () => void
  navOpen: boolean
}) {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--h-topbar)] items-center gap-3 border-b border-line bg-canvas/95 px-[var(--gutter)] backdrop-blur-sm">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        aria-expanded={navOpen}
        className="-ml-1.5 rounded-md p-1.5 text-ink-2 hover:bg-hover lg:hidden"
      >
        <IconMenu className="h-4 w-4" />
      </button>
      <span className="lg:hidden">
        <Wordmark />
      </span>

      <div className="flex-1" />

      {canSendMoney && (
        <Link
          to="/transfer"
          className="inline-flex h-[var(--h-control)] items-center rounded-md bg-ink px-3 text-[13px] font-medium text-ink-inverse transition-colors duration-[var(--dur-fast)] hover:bg-[#000] active:translate-y-px"
        >
          Send money
        </Link>
      )}
    </header>
  )
}

function Sidebar({
  groups,
  username,
  role,
  onLogout,
  variant = 'fixed',
  onClose,
}: {
  groups: NavGroup[]
  username: string
  role: Role
  onLogout: () => void
  variant?: 'fixed' | 'drawer'
  onClose?: () => void
}) {
  const drawer = variant === 'drawer'

  return (
    <nav
      aria-label="Main"
      className={cn(
        'flex flex-col border-r border-line bg-surface',
        drawer
          ? 'h-full w-full'
          : 'fixed inset-y-0 left-0 z-20 hidden w-[var(--w-rail)] lg:flex xl:w-[var(--w-sidebar)]',
      )}
    >
      <div
        className={cn(
          'flex h-[var(--h-topbar)] shrink-0 items-center border-b border-line',
          drawer ? 'justify-between px-4' : 'px-4 lg:justify-center xl:justify-start',
        )}
      >
        {drawer ? (
          <>
            <Wordmark />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="rounded-md p-1.5 text-ink-2 hover:bg-hover"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </>
        ) : (
          <Wordmark collapsible />
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {groups.map((group, index) => (
          <div key={group.label ?? index} className={index > 0 ? 'mt-5' : ''}>
            {group.label && (
              <p
                className={cn(
                  't-col px-4 pb-1.5',
                  // The rail has no room for a group label; the gap between
                  // groups carries the grouping on its own at that width.
                  drawer ? '' : 'hidden xl:block',
                )}
              >
                {group.label}
              </p>
            )}
            <ul className="space-y-px px-2">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavItemLink item={item} compact={!drawer} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {(role === 'ADMIN' || role === 'AUDITOR') && <IntegrityIndicator compact={!drawer} />}
      <UserPanel username={username} role={role} onLogout={onLogout} compact={!drawer} />
    </nav>
  )
}

function NavItemLink({ item, compact }: { item: NavItem; compact: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={item.label}
      className={({ isActive }) =>
        cn(
          'flex h-8 items-center gap-2.5 rounded-md text-[13px] transition-colors duration-[var(--dur-fast)]',
          compact ? 'justify-center px-0 xl:justify-start xl:px-2.5' : 'px-2.5',
          // Selection is a neutral tint and a weight change, not a saturated
          // pill. A blue block behind the active item is the loudest thing on
          // the screen and it marks the one place you already know you are.
          isActive
            ? 'bg-[var(--surface-active)] font-medium text-ink'
            : 'text-ink-2 hover:bg-hover hover:text-ink',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={compact ? 'hidden xl:inline' : ''}>{item.label}</span>
    </NavLink>
  )
}

/**
 * The invariant, made ambient.
 *
 * <p>Penny can prove that no money was created or destroyed: every account
 * balance sums to exactly zero, because money entering the ledger is posted
 * against a cash vault rather than conjured. That is the most credible thing
 * about the product and it used to be buried on the audit page, which most
 * people never open. Here it is present on every screen, and quiet while it is
 * true -- which is the right volume for a fact that only matters when it stops
 * being one.
 *
 * <p>Rendered only for roles the API actually grants it to. Reading the
 * integrity check is admin and auditor territory, and mounting this for a teller
 * would fire a request that always 403s -- the indicator would then be
 * permanently absent for reasons indistinguishable from the ledger being fine.
 */
function IntegrityIndicator({ compact }: { compact: boolean }) {
  const { data, error } = useAsync(() => ledgerApi.integrity(), [])

  if (error || !data) return null
  const balanced = data.balanced

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-t border-line px-4 py-2.5',
        compact ? 'justify-center xl:justify-start' : '',
      )}
      title={balanced ? 'Debits and credits are equal across every account' : 'Ledger does not balance'}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          balanced ? 'bg-positive' : 'bg-negative',
        )}
      />
      <span className={cn('t-micro', compact ? 'hidden xl:inline' : '')}>
        {balanced ? 'Books balanced' : 'Ledger out of balance'}
      </span>
    </div>
  )
}

function UserPanel({
  username,
  role,
  onLogout,
  compact,
}: {
  username: string
  role: Role
  onLogout: () => void
  compact: boolean
}) {
  return (
    <div className="border-t border-line p-2">
      <div className={cn('flex items-center gap-2.5 px-1.5 py-1', compact ? 'justify-center xl:justify-start' : '')}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[var(--surface-active)] text-[11px] font-semibold uppercase text-ink-2">
          {username.slice(0, 1)}
        </span>
        <div className={cn('min-w-0 flex-1', compact ? 'hidden xl:block' : '')}>
          <p className="truncate text-[13px] font-medium text-ink">{username}</p>
          <p className="t-micro">{titleCase(role)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className={cn(
          'mt-0.5 flex h-8 w-full items-center gap-2.5 rounded-md text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink',
          compact ? 'justify-center px-0 xl:justify-start xl:px-2.5' : 'px-2.5',
        )}
      >
        <IconLogout className="h-4 w-4 shrink-0" />
        <span className={compact ? 'hidden xl:inline' : ''}>Sign out</span>
      </button>
    </div>
  )
}

/**
 * One wordmark, defined once. There were previously three copies of this in the
 * codebase, which is how a product ends up with two subtly different logos.
 */
export function Wordmark({ collapsible = false }: { collapsible?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-sm bg-ink text-[12px] font-semibold text-ink-inverse">
        P
      </span>
      <span
        className={cn(
          'text-[15px] font-semibold tracking-[-0.01em] text-ink',
          collapsible ? 'hidden xl:inline' : '',
        )}
      >
        Penny
      </span>
    </span>
  )
}
