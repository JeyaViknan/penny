import { useState } from 'react'
import { transfersApi } from '../api/endpoints'
import { IconHistory } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { ListSection } from '../components/ui/List'
import { EmptyState, ErrorState, PageHeader } from '../components/ui/Surface'
import { useAsync } from '../lib/useAsync'
import { RowSkeletons, TransactionRow } from '../components/TransactionRow'

const PAGE_SIZE = 20

/**
 * Full history. Paged server-side, and a customer's results are narrowed in SQL
 * to transactions touching their own accounts — so the totals shown are theirs,
 * not a filtered view of everyone's.
 */
export function ActivityPage() {
  const [page, setPage] = useState(0)
  const history = useAsync(() => transfersApi.history({ page, size: PAGE_SIZE }), [page])

  const data = history.data
  const totalPages = data?.totalPages ?? 0
  const from = (data?.page ?? 0) * PAGE_SIZE + 1
  const to = Math.min(from + (data?.items.length ?? 0) - 1, data?.totalItems ?? 0)

  return (
    <div>
      <PageHeader title="Activity" />

      {history.error && (
        <div className="mb-6 px-4 sm:px-0">
          <ErrorState message={history.error} onRetry={history.reload} />
        </div>
      )}

      <ListSection
        footer={data && data.totalItems > 0 ? `Showing ${from}–${to} of ${data.totalItems}` : undefined}
      >
        {history.loading ? (
          <RowSkeletons count={6} />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<IconHistory className="h-6 w-6" />}
            title="No transactions yet"
            description="Once money starts moving, every posting is listed here with its full audit trail."
          />
        ) : (
          data!.items.map((t) => <TransactionRow key={t.transactionId} transaction={t} />)
        )}
      </ListSection>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-3 px-4 sm:px-0">
          <Button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || history.loading}>
            Previous
          </Button>
          <Button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1 || history.loading}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
