import { Link, useParams } from 'react-router-dom'
import { ledgerApi, transfersApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { PageLayout, Section } from '../components/layout/PageLayout'
import { IconChevronRight } from '../components/Icons'
import { Badge } from '../components/ui/Badge'
import { ButtonLink } from '../components/ui/Button'
import { Money } from '../components/ui/Money'
import { AsyncSection, ErrorState, Shimmer, TableSkeleton } from '../components/ui/States'
import { formatDateTime } from '../lib/money'
import { humanise, titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'

/**
 * One transaction, in full.
 *
 * <p>The two ledger entries are the point of this page. A receipt that says
 * "$42.50 sent" is a claim; the debit and the credit sitting side by side,
 * summing to zero, are the evidence. Staff see both legs — a customer sees the
 * summary, because the counterparty's side of the entry is not theirs to read.
 */
export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const transactionId = Number(id)
  const { user } = useAuth()
  const transfer = useAsync(() => transfersApi.get(transactionId), [transactionId])

  const canSeeLegs = user?.role !== 'CUSTOMER'
  const legs = useAsync(
    () => (canSeeLegs ? ledgerApi.forTransaction(transactionId) : Promise.resolve([])),
    [transactionId, canSeeLegs],
  )

  if (transfer.error) {
    return (
      <PageLayout title="Transaction" width="measure">
        <ErrorState message={transfer.error} onRetry={transfer.reload} />
        <div className="mt-4">
          <ButtonLink to="/transactions">All transactions</ButtonLink>
        </div>
      </PageLayout>
    )
  }

  const data = transfer.data

  return (
    <PageLayout title={data ? data.reference : 'Transaction'} width="measure">
      <nav aria-label="Breadcrumb" className="-mt-2 mb-5">
        <Link to="/transactions" className="t-micro inline-flex items-center gap-1 hover:text-ink">
          Transactions
          <IconChevronRight className="h-3 w-3" />
        </Link>
      </nav>

      {transfer.loading || !data ? (
        <>
          <Shimmer className="h-9 w-40" />
          <Shimmer className="mt-6 h-32 w-full" />
        </>
      ) : (
        <>
          <p className="t-figure mb-1 text-ink">
            <Money minorUnits={data.amountMinorUnits} className="t-figure" />
          </p>
          <p className="t-micro mb-7">
            {humanise(data.transactionType)} · #{data.transactionId}
          </p>

          <dl className="divide-y divide-[var(--border)] overflow-hidden rounded-md border border-line bg-surface">
            <Row label="Type">
              <Badge>{humanise(data.transactionType)}</Badge>
            </Row>
            <Row label="From">
              <span className="t-ident">{data.sourceAccountNumber}</span>
            </Row>
            <Row label="To">
              <span className="t-ident">{data.destinationAccountNumber}</span>
            </Row>
            <Row label="Reference">{data.reference}</Row>
            <Row label="Posted">{formatDateTime(data.createdAt)}</Row>
          </dl>

          {canSeeLegs && (
            <Section title="Ledger entries" className="mt-8">
              <AsyncSection
                data={legs.data}
                loading={legs.loading}
                error={legs.error}
                onRetry={legs.reload}
                skeleton={<TableSkeleton rows={2} columns={3} />}
              >
                {(entries) => (
                  <div className="overflow-hidden rounded-md border border-line bg-surface">
                    <table className="w-full">
                      <caption className="sr-only">Ledger entries for this transaction</caption>
                      <thead>
                        <tr className="border-b border-line bg-sunken">
                          <th scope="col" className="t-col h-[var(--h-row-head)] px-3 text-left font-normal">
                            Side
                          </th>
                          <th scope="col" className="t-col h-[var(--h-row-head)] px-3 text-left font-normal">
                            Account
                          </th>
                          <th scope="col" className="t-col h-[var(--h-row-head)] px-3 text-right font-normal">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-line last:border-b-0">
                            <td className="h-[var(--h-row)] px-3">
                              <Badge tone={entry.entryType === 'CREDIT' ? 'positive' : 'neutral'}>
                                {titleCase(entry.entryType)}
                              </Badge>
                            </td>
                            <td className="h-[var(--h-row)] px-3">
                              <Link
                                to={`/accounts/${entry.accountId}`}
                                className="t-row text-accent hover:underline"
                              >
                                Account #{entry.accountId}
                              </Link>
                            </td>
                            <td className="h-[var(--h-row)] px-3 text-right">
                              <Money
                                minorUnits={
                                  entry.entryType === 'CREDIT'
                                    ? entry.amountMinorUnits
                                    : -entry.amountMinorUnits
                                }
                                variant="signed"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AsyncSection>
              <p className="t-body mt-3 text-ink-3">
                The two entries are equal and opposite, which is why this transaction changed the
                distribution of money without changing how much of it exists.
              </p>
            </Section>
          )}
        </>
      )}
    </PageLayout>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="t-col shrink-0">{label}</dt>
      <dd className="t-row min-w-0 truncate text-right text-ink">{children}</dd>
    </div>
  )
}
