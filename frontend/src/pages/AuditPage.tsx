import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { auditApi, ledgerApi, usersApi } from '../api/endpoints'
import type { AuditLogResponse } from '../api/types'
import { PageLayout } from '../components/layout/PageLayout'
import { IconChevronDown, IconChevronRight } from '../components/Icons'
import { Money } from '../components/ui/Money'
import { AsyncSection, EmptyState, TableSkeleton } from '../components/ui/States'
import { ClearFilters, FilterSelect, Pagination, Toolbar } from '../components/ui/Toolbar'
import { cn } from '../lib/cn'
import { formatShortDate, formatTime } from '../lib/format'
import { formatDateTime } from '../lib/money'
import { humanise } from '../lib/text'
import { useAsync } from '../lib/useAsync'

const PAGE_SIZE = 50

const ACTION_OPTIONS = [
  { value: 'LOGIN', label: 'Login' },
  { value: 'CREATE_USER', label: 'Create user' },
  { value: 'CREATE_ACCOUNT', label: 'Create account' },
  { value: 'CHANGE_ACCOUNT_STATUS', label: 'Change status' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
]

const ENTITY_OPTIONS = [
  { value: 'Account', label: 'Account' },
  { value: 'Transaction', label: 'Transaction' },
  { value: 'User', label: 'User' },
]

/**
 * The audit trail, on the same table grammar as everything else.
 *
 * <p>Rows expand in place rather than opening a drawer. An auditor's work is
 * comparing adjacent events — who did what, immediately before and after — and a
 * panel that covers the neighbouring rows takes away the only context that
 * matters.
 *
 * <p>This endpoint used to return the entire append-only table on every request.
 * It is now filtered and paged in SQL, so the counts below describe the whole
 * trail rather than the slice that happened to load.
 */
export function AuditPage() {
  const [params, setParams] = useSearchParams()
  const action = params.get('action') ?? ''
  const entityType = params.get('entityType') ?? ''
  const actorUserId = params.get('actorUserId') ?? ''
  const page = Number(params.get('page') ?? 0)

  const [expanded, setExpanded] = useState<number | null>(null)

  const people = useAsync(() => usersApi.list(), [])
  const events = useAsync(
    () =>
      auditApi.search({
        action: action || undefined,
        entityType: entityType || undefined,
        actorUserId: actorUserId ? Number(actorUserId) : undefined,
        page,
        size: PAGE_SIZE,
      }),
    [action, entityType, actorUserId, page],
  )

  function update(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const actorOptions = useMemo(
    () => (people.data ?? []).map((person) => ({ value: String(person.id), label: person.username })),
    [people.data],
  )

  const filtered = Boolean(action || entityType || actorUserId)

  return (
    <PageLayout
      title="Audit"
      description="Every action the system recorded, in the order it happened. Entries cannot be edited or removed."
      toolbar={
        <Toolbar>
          <FilterSelect label="Action" value={action} onChange={(v) => update('action', v)} options={ACTION_OPTIONS} />
          <FilterSelect label="Entity" value={entityType} onChange={(v) => update('entityType', v)} options={ENTITY_OPTIONS} />
          <FilterSelect label="Actor" value={actorUserId} onChange={(v) => update('actorUserId', v)} options={actorOptions} />
          <ClearFilters show={filtered} onClear={() => setParams(new URLSearchParams())} />
        </Toolbar>
      }
    >
      <IntegrityBar />

      <AsyncSection
        data={events.data}
        loading={events.loading}
        error={events.error}
        onRetry={events.reload}
        skeleton={<TableSkeleton rows={12} columns={5} />}
      >
        {(data) => (
          <div className="overflow-hidden rounded-md border border-line bg-surface">
            {data.items.length === 0 ? (
              <EmptyState
                title={filtered ? 'No events match those filters' : 'No events recorded yet'}
                description={
                  filtered
                    ? 'Clear the filters to see the whole trail.'
                    : 'Actions are recorded here automatically as people use the system.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">Audit trail</caption>
                  <thead>
                    <tr className="border-b border-line bg-sunken">
                      <th scope="col" className="h-[var(--h-row-head)] w-8 px-3" />
                      <th scope="col" className="t-col h-[var(--h-row-head)] w-[130px] px-3 font-normal">
                        Time
                      </th>
                      <th scope="col" className="t-col h-[var(--h-row-head)] w-[130px] px-3 font-normal">
                        Actor
                      </th>
                      <th scope="col" className="t-col h-[var(--h-row-head)] px-3 font-normal">
                        Action
                      </th>
                      <th scope="col" className="t-col hidden h-[var(--h-row-head)] w-[150px] px-3 font-normal lg:table-cell">
                        Entity
                      </th>
                      <th scope="col" className="t-col hidden h-[var(--h-row-head)] w-[130px] px-3 font-normal xl:table-cell">
                        IP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((event) => (
                      <AuditRow
                        key={event.id}
                        event={event}
                        expanded={expanded === event.id}
                        onToggle={() => setExpanded(expanded === event.id ? null : event.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex h-11 items-center justify-between gap-4 border-t border-line px-3">
              <Pagination
                page={data.page}
                size={data.size}
                totalItems={data.totalItems}
                onPageChange={(next) => update('page', String(next))}
                noun="events"
              />
            </div>
          </div>
        )}
      </AsyncSection>
    </PageLayout>
  )
}

function AuditRow({
  event,
  expanded,
  onToggle,
}: {
  event: AuditLogResponse
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className={cn(
          'focus-row cursor-pointer border-b border-line transition-colors duration-[var(--dur-fast)]',
          expanded ? 'bg-[var(--surface-active)]' : 'hover:bg-hover',
        )}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault()
            onToggle()
          }
        }}
        aria-expanded={expanded}
      >
        <td className="h-[var(--h-row)] px-3">
          {expanded ? (
            <IconChevronDown className="h-3.5 w-3.5 text-ink-2" />
          ) : (
            <IconChevronRight className="h-3.5 w-3.5 text-ink-faint" />
          )}
        </td>
        <td className="h-[var(--h-row)] px-3 whitespace-nowrap">
          <span className="t-row text-ink-2" title={formatDateTime(event.createdAt)}>
            {formatShortDate(event.createdAt)}
          </span>
          <span className="t-micro ml-1.5">{formatTime(event.createdAt)}</span>
        </td>
        <td className="h-[var(--h-row)] px-3">
          <span className="t-row block truncate text-ink">{event.actorUsername ?? 'System'}</span>
        </td>
        <td className="h-[var(--h-row)] px-3">
          <span className="t-row text-ink">{humanise(event.action)}</span>
        </td>
        <td className="hidden h-[var(--h-row)] px-3 lg:table-cell">
          <span className="t-row text-ink-2">
            {event.entityType}
            {event.entityId && <span className="t-ident ml-1 text-ink-3">#{event.entityId}</span>}
          </span>
        </td>
        <td className="hidden h-[var(--h-row)] px-3 xl:table-cell">
          <span className="t-ident text-ink-3">{event.ipAddress}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-line bg-sunken">
          <td />
          <td colSpan={5} className="px-3 py-3">
            <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              <Detail label="Recorded">{formatDateTime(event.createdAt)}</Detail>
              <Detail label="Request id">
                <span className="t-ident">{event.requestId}</span>
              </Detail>
              <Detail label="Entity">
                {event.entityType}
                {event.entityId ? ` #${event.entityId}` : ''}
              </Detail>
              <Detail label="IP address">
                <span className="t-ident">{event.ipAddress}</span>
              </Detail>
              {event.details && (
                <div className="sm:col-span-2">
                  <dt className="t-col mb-1">Details</dt>
                  <dd className="t-ident break-all text-ink-2">{event.details}</dd>
                </div>
              )}
            </dl>
          </td>
        </tr>
      )}
    </>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="t-col mb-0.5">{label}</dt>
      <dd className="t-row text-ink">{children}</dd>
    </div>
  )
}

/**
 * The invariant, stated in full.
 *
 * <p>The sidebar carries a one-word version of this on every screen. Here it
 * gets the numbers, because this is the page where someone has come specifically
 * to check rather than to be reassured. Debits and credits are re-derived from
 * the raw entries on each request rather than read from a stored total, which is
 * the only version of this claim worth making.
 */
function IntegrityBar() {
  const { data, loading, error } = useAsync(() => ledgerApi.integrity(), [])
  if (loading || error || !data) return null

  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-md border px-4 py-3',
        data.balanced ? 'border-line bg-surface' : 'border-negative bg-negative-tint',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 rounded-full', data.balanced ? 'bg-positive' : 'bg-negative')}
        />
        <span className="text-[13px] font-medium text-ink">
          {data.balanced ? 'Books balanced' : 'Ledger out of balance'}
        </span>
      </div>
      <Figure label="Total debits">
        <Money minorUnits={data.totalDebitsMinorUnits} />
      </Figure>
      <Figure label="Total credits">
        <Money minorUnits={data.totalCreditsMinorUnits} />
      </Figure>
      <Figure label="Net across all accounts">
        <Money minorUnits={data.netAcrossAllAccountsMinorUnits} variant="balance" />
      </Figure>
      <Figure label="Entries">
        <span className="t-money">{data.ledgerEntryCount.toLocaleString()}</span>
      </Figure>
    </div>
  )
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="t-col">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}
