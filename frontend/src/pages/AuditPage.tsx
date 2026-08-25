import { auditApi, ledgerApi } from '../api/endpoints'
import type { LedgerIntegrityResponse } from '../api/types'
import { IconAudit, IconShield } from '../components/Icons'
import { Glyph, ListRow, ListSection } from '../components/ui/List'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/Surface'
import { formatMinorUnits, formatRelativeDate } from '../lib/money'
import { humanise } from '../lib/text'
import { useAsync } from '../lib/useAsync'
import { RowSkeletons } from '../components/TransactionRow'

export function AuditPage() {
  const entries = useAsync(() => auditApi.list(), [])
  const integrity = useAsync(() => ledgerApi.integrity(), [])

  return (
    <div>
      <PageHeader title="Audit trail" />

      <div className="mb-8 px-4 sm:px-0">
        <IntegrityCard data={integrity.data} loading={integrity.loading} error={integrity.error} onRetry={integrity.reload} />
      </div>

      {entries.error && (
        <div className="mb-6 px-4 sm:px-0">
          <ErrorState message={entries.error} onRetry={entries.reload} />
        </div>
      )}

      <ListSection
        header="Recorded actions"
        footer="Every state-changing action is recorded here. Entries are append-only — the database itself rejects any attempt to edit or delete them."
      >
        {entries.loading ? (
          <RowSkeletons count={6} />
        ) : (entries.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<IconAudit className="h-6 w-6" />}
            title="Nothing recorded yet"
            description="Account openings, transfers and status changes appear here as they happen."
          />
        ) : (
          entries.data!.map((entry) => (
            <ListRow
              key={entry.id}
              leading={
                <Glyph tone={ACTION_TONE[entry.action] ?? 'gray'}>
                  <IconAudit className="h-[17px] w-[17px]" />
                </Glyph>
              }
              title={humanise(entry.action)}
              subtitle={`${entry.entityType}${entry.entityId ? ` #${entry.entityId}` : ''} · ${
                entry.actorUserId ? `user #${entry.actorUserId}` : 'system'
              }`}
              value={<span className="t-footnote text-[var(--label-tertiary)]">{formatRelativeDate(entry.createdAt)}</span>}
              valueSubtitle={<span className="t-money text-[11px]">{entry.requestId.slice(0, 8)}</span>}
            />
          ))
        )}
      </ListSection>
    </div>
  )
}

const ACTION_TONE: Record<string, 'green' | 'orange' | 'blue' | 'indigo' | 'red'> = {
  DEPOSIT: 'green',
  WITHDRAWAL: 'orange',
  TRANSFER: 'blue',
  CREATE_ACCOUNT: 'indigo',
  CREATE_USER: 'indigo',
  CHANGE_ACCOUNT_STATUS: 'red',
}

/**
 * Leads the screen with the answer an auditor actually came for. The point of a
 * double-entry ledger is that "do the books balance?" is answerable, so the
 * answer is shown rather than left behind an API call.
 */
function IntegrityCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data: LedgerIntegrityResponse | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const balanced = data?.balanced ?? false

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-hero)] shadow-[var(--shadow-raised)]"
      style={{ background: 'linear-gradient(160deg, #ffffff 0%, #fbfbfd 46%, #f0f0f4 100%)' }}
    >
      <div className="flex items-start gap-3.5 p-6">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: loading ? 'var(--gray-2)' : balanced ? 'var(--green-fill)' : 'var(--red-fill)' }}
        >
          <IconShield className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="t-title3 text-[var(--label)]">
            {loading ? 'Checking the books…' : balanced ? 'The books balance' : 'The books do not balance'}
          </p>
          <p className="t-subhead mt-1.5 text-[var(--label-secondary)]">
            {loading
              ? 'Re-deriving every total directly from the ledger entries.'
              : balanced
                ? 'Total debits equal total credits, and every account balance sums to exactly zero. No money has been created or destroyed.'
                : 'Debits and credits disagree. This should never happen and needs investigating immediately.'}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 border-t border-[var(--separator)]">
        <Figure label="Debits" value={data && formatMinorUnits(data.totalDebitsMinorUnits)} loading={loading} />
        <Figure label="Credits" value={data && formatMinorUnits(data.totalCreditsMinorUnits)} loading={loading} divider />
        <Figure label="Entries" value={data && String(data.ledgerEntryCount)} loading={loading} divider />
      </dl>
    </div>
  )
}

function Figure({ label, value, loading, divider }: { label: string; value?: string | null; loading: boolean; divider?: boolean }) {
  return (
    <div className={divider ? 'border-l border-[var(--separator)] px-4 py-3.5' : 'px-4 py-3.5'}>
      <dt className="t-caption text-[var(--label-tertiary)]">{label}</dt>
      <dd className="t-money mt-1 text-[15px] font-medium text-[var(--label)]">
        {loading || !value ? <Skeleton className="h-4 w-16" /> : value}
      </dd>
    </div>
  )
}

