import { auditApi, ledgerApi } from '../api/endpoints'
import type { AuditLogResponse } from '../api/types'
import { IconAudit, IconShield } from '../components/Icons'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/Surface'
import { formatDateTime, formatMinorUnits } from '../lib/money'
import { useAsync } from '../lib/useAsync'

export function AuditPage() {
  const entries = useAsync(() => auditApi.list(), [])
  const integrity = useAsync(() => ledgerApi.integrity(), [])

  return (
    <div>
      <PageHeader
        title="Audit trail"
        description="Every state-changing action, recorded immutably. Entries can never be edited or deleted."
      />

      <IntegrityPanel data={integrity.data} loading={integrity.loading} error={integrity.error} onRetry={integrity.reload} />

      {entries.error && (
        <div className="mb-4">
          <ErrorState message={entries.error} onRetry={entries.reload} />
        </div>
      )}

      <Card padded={false}>
        <CardHeader title="Recorded actions" description="Newest first." />
        <DataTable
          caption="Audit log"
          columns={COLUMNS}
          rows={entries.data ?? []}
          rowKey={(e) => e.id}
          loading={entries.loading}
          skeletonRows={8}
          empty={
            <EmptyState
              icon={<IconAudit className="h-5 w-5" />}
              title="Nothing recorded yet"
              description="Account openings, transfers and status changes will appear here as they happen."
            />
          }
        />
      </Card>
    </div>
  )
}

/**
 * Surfaces the integrity check as the first thing an auditor sees. The point of
 * a double-entry ledger is that "did the books balance?" is answerable, so the
 * answer should be visible rather than buried behind an API call.
 */
function IntegrityPanel({
  data,
  loading,
  error,
  onRetry,
}: {
  data: import('../api/types').LedgerIntegrityResponse | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (error) {
    return (
      <div className="mb-6">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    )
  }

  const balanced = data?.balanced ?? false

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
              loading
                ? 'bg-[var(--surface-inset)] text-[var(--text-tertiary)]'
                : balanced
                  ? 'bg-[var(--positive-subtle)] text-[var(--positive)]'
                  : 'bg-[var(--negative-subtle)] text-[var(--negative)]'
            }`}
          >
            <IconShield className="h-5 w-5" />
          </div>
          <div>
            <p className="t-subhead text-[var(--text-primary)]">
              {loading ? 'Checking the books…' : balanced ? 'The books balance' : 'The books do not balance'}
            </p>
            <p className="t-caption mt-0.5 max-w-md text-[var(--text-tertiary)]">
              {balanced
                ? 'Total debits equal total credits, and every account balance sums to exactly zero — no money has been created or destroyed.'
                : loading
                  ? 'Re-deriving totals directly from the ledger entries.'
                  : 'Debits and credits disagree. This should never happen and needs investigation immediately.'}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          <IntegrityFigure label="Debits" value={data && formatMinorUnits(data.totalDebitsMinorUnits)} loading={loading} />
          <IntegrityFigure label="Credits" value={data && formatMinorUnits(data.totalCreditsMinorUnits)} loading={loading} />
          <IntegrityFigure label="Entries" value={data && String(data.ledgerEntryCount)} loading={loading} />
        </dl>
      </div>
    </Card>
  )
}

function IntegrityFigure({ label, value, loading }: { label: string; value: string | null | undefined; loading: boolean }) {
  return (
    <div>
      <dt className="t-label text-[var(--text-tertiary)]">{label}</dt>
      <dd className="t-figure mt-1 text-[0.875rem] text-[var(--text-primary)]">
        {loading || !value ? <Skeleton className="h-4 w-20" /> : value}
      </dd>
    </div>
  )
}

const COLUMNS: Column<AuditLogResponse>[] = [
  {
    key: 'action',
    header: 'Action',
    primary: true,
    render: (e) => <Badge tone="accent">{e.action}</Badge>,
  },
  {
    key: 'entity',
    header: 'Entity',
    secondary: true,
    render: (e) => (
      <span className="t-caption text-[var(--text-secondary)]">
        {e.entityType}
        {e.entityId ? ` #${e.entityId}` : ''}
      </span>
    ),
  },
  {
    key: 'actor',
    header: 'Actor',
    render: (e) => (
      <span className="t-caption text-[var(--text-secondary)]">{e.actorUserId ? `User #${e.actorUserId}` : 'System'}</span>
    ),
  },
  {
    key: 'time',
    header: 'When',
    render: (e) => <span className="t-caption whitespace-nowrap text-[var(--text-tertiary)]">{formatDateTime(e.createdAt)}</span>,
  },
  {
    key: 'request',
    header: 'Request',
    hideOnMobile: true,
    render: (e) => (
      <span className="t-figure text-[0.75rem] text-[var(--text-tertiary)]" title={e.requestId}>
        {e.requestId.slice(0, 8)}
      </span>
    ),
  },
  {
    key: 'ip',
    header: 'IP address',
    align: 'right',
    hideOnMobile: true,
    render: (e) => <span className="t-figure text-[0.75rem] text-[var(--text-tertiary)]">{e.ipAddress}</span>,
  },
]
