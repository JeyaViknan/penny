import { type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { transfersApi } from '../api/endpoints'
import { IconArrowLeft } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { Badge, Card, EmptyState, PageHeader, Skeleton } from '../components/ui/Surface'
import { formatAccountNumber, formatDateTime, formatMinorUnits, isVaultSide } from '../lib/money'
import { useAsync } from '../lib/useAsync'

export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const transfer = useAsync(() => transfersApi.get(Number(id)), [id])
  const data = transfer.data

  return (
    <div className="max-w-lg">
      <button
        onClick={() => navigate(-1)}
        className="t-caption mb-4 inline-flex items-center gap-1.5 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <IconArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {transfer.error ? (
        <EmptyState
          title="This transaction could not be opened"
          description={transfer.error}
          action={
            <div className="flex gap-2">
              <Button onClick={transfer.reload}>Try again</Button>
              <Button variant="primary" asLink="/activity">
                View all activity
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <PageHeader title={`Transaction #${id}`} description="A posted, immutable movement of money." />

          <Card padded={false}>
            <div className="border-b border-[var(--border-subtle)] px-5 py-7 text-center">
              <p className="t-label text-[var(--text-tertiary)]">Amount</p>
              {transfer.loading || !data ? (
                <Skeleton className="mx-auto mt-3 h-9 w-40" />
              ) : (
                <>
                  <p className="t-figure mt-2 text-[2rem] font-semibold tracking-tight text-[var(--text-primary)]">
                    {formatMinorUnits(data.amountMinorUnits)}
                  </p>
                  <div className="mt-2.5">
                    <Badge>{data.transactionType}</Badge>
                  </div>
                </>
              )}
            </div>

            <dl className="divide-y divide-[var(--border-subtle)]">
              <Row label="Reference" loading={transfer.loading}>
                {data?.reference}
              </Row>
              <Row label="From" loading={transfer.loading}>
                {data && (
                  <AccountRef
                    isVault={isVaultSide(data.transactionType, 'debit')}
                    id={data.sourceAccountId}
                    number={data.sourceAccountNumber}
                  />
                )}
              </Row>
              <Row label="To" loading={transfer.loading}>
                {data && (
                  <AccountRef
                    isVault={isVaultSide(data.transactionType, 'credit')}
                    id={data.destinationAccountId}
                    number={data.destinationAccountNumber}
                  />
                )}
              </Row>
              <Row label="Posted" loading={transfer.loading}>
                {data && formatDateTime(data.createdAt)}
              </Row>
            </dl>
          </Card>
        </>
      )}
    </div>
  )
}

function AccountRef({ isVault, id, number }: { isVault: boolean; id: number; number: string }) {
  if (isVault) {
    return <span className="t-caption text-[var(--text-tertiary)]">Cash vault</span>
  }
  return (
    <Link
      to={`/accounts/${id}`}
      className="t-figure text-[0.875rem] transition-colors hover:text-[var(--accent-fg)]"
    >
      {formatAccountNumber(number)}
    </Link>
  )
}

function Row({ label, children, loading }: { label: string; children: ReactNode; loading: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <dt className="t-caption text-[var(--text-secondary)]">{label}</dt>
      <dd className="t-body min-w-0 truncate text-right text-[var(--text-primary)]">
        {loading ? <Skeleton className="ml-auto h-4 w-28" /> : children}
      </dd>
    </div>
  )
}
