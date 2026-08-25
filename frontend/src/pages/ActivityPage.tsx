import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { transfersApi } from '../api/endpoints'
import type { TransactionSummaryResponse } from '../api/types'
import { IconHistory } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Badge, Card, EmptyState, ErrorState, PageHeader } from '../components/ui/Surface'
import { formatAccountNumber, formatDateTime, formatMinorUnits, isVaultSide } from '../lib/money'
import { useAsync } from '../lib/useAsync'

const PAGE_SIZE = 20

/**
 * Full transaction history. The list is paged server-side, and a customer's
 * results are narrowed in SQL to transactions touching their own accounts --
 * so the totals shown here are their totals, not a filtered view of everyone's.
 */
export function ActivityPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const history = useAsync(() => transfersApi.history({ page, size: PAGE_SIZE }), [page])

  const data = history.data
  const totalPages = data?.totalPages ?? 0
  const showingFrom = (data?.page ?? 0) * PAGE_SIZE + 1
  const showingTo = Math.min(showingFrom + (data?.items.length ?? 0) - 1, data?.totalItems ?? 0)

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Every deposit, withdrawal and transfer, newest first."
      />

      {history.error && (
        <div className="mb-4">
          <ErrorState message={history.error} onRetry={history.reload} />
        </div>
      )}

      <Card padded={false}>
        <DataTable
          caption="Transaction history"
          columns={COLUMNS}
          rows={data?.items ?? []}
          rowKey={(t) => t.transactionId}
          loading={history.loading}
          skeletonRows={8}
          onRowClick={(t) => navigate(`/transfers/${t.transactionId}`)}
          empty={
            <EmptyState
              icon={<IconHistory className="h-5 w-5" />}
              title="No transactions yet"
              description="Once money starts moving, every posting will be listed here with its full audit trail."
            />
          }
        />

        {data && data.totalItems > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-3">
            <p className="t-caption text-[var(--text-tertiary)]">
              {showingFrom}–{showingTo} of {data.totalItems}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || history.loading}>
                Previous
              </Button>
              <Button
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1 || history.loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

const COLUMNS: Column<TransactionSummaryResponse>[] = [
  {
    key: 'reference',
    header: 'Reference',
    primary: true,
    render: (t) => <span className="text-[var(--text-primary)]">{t.reference}</span>,
  },
  { key: 'type', header: 'Type', secondary: true, render: (t) => <Badge>{t.transactionType}</Badge> },
  {
    key: 'from',
    header: 'From',
    render: (t) => <AccountCell type={t.transactionType} side="debit" id={t.debitAccountId} number={t.debitAccountNumber} />,
  },
  {
    key: 'to',
    header: 'To',
    render: (t) => <AccountCell type={t.transactionType} side="credit" id={t.creditAccountId} number={t.creditAccountNumber} />,
  },
  {
    key: 'date',
    header: 'Posted',
    hideOnMobile: true,
    render: (t) => (
      <span className="t-caption whitespace-nowrap text-[var(--text-tertiary)]">{formatDateTime(t.createdAt)}</span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (t) => (
      <span className="t-figure whitespace-nowrap text-[0.875rem] text-[var(--text-primary)]">
        {formatMinorUnits(t.amountMinorUnits)}
      </span>
    ),
  },
]

/**
 * Renders one side of a transaction, showing "Cash vault" instead of the
 * institution's internal account number — that number is an implementation
 * detail of double-entry, not something a person should have to decode.
 */
function AccountCell({
  type,
  side,
  id,
  number,
}: {
  type: TransactionSummaryResponse['transactionType']
  side: 'debit' | 'credit'
  id: number
  number: string
}) {
  if (isVaultSide(type, side)) {
    return <span className="t-caption whitespace-nowrap text-[var(--text-tertiary)]">Cash vault</span>
  }
  return (
    <Link
      to={`/accounts/${id}`}
      onClick={(e) => e.stopPropagation()}
      className="t-figure whitespace-nowrap text-[0.8125rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-fg)]"
    >
      {formatAccountNumber(number)}
    </Link>
  )
}
