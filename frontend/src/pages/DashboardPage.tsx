import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { accountsApi, ledgerApi, transfersApi } from '../api/endpoints'
import type { AccountResponse, TransactionSummaryResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageLayout, Section } from '../components/layout/PageLayout'
import { Badge } from '../components/ui/Badge'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Money } from '../components/ui/Money'
import { StatStrip } from '../components/ui/StatStrip'
import { AsyncSection, EmptyState, ErrorState, TableSkeleton } from '../components/ui/States'
import { cn } from '../lib/cn'
import { counterpartyDetail, counterpartyName, formatShortDate } from '../lib/format'
import { formatDateTime, formatMinorUnits } from '../lib/money'
import { humanise } from '../lib/text'
import { useAsync } from '../lib/useAsync'
import { statusLabel, statusTone } from './accountStatus'

/**
 * What is happening with the money right now, top to bottom.
 *
 * <p>Deliberately not a dashboard of charts. Penny has one dataset worth
 * visualising — where the money sits — and one shape that answers it, so there
 * is exactly one visualisation on this page and no line charts, sparklines or
 * trend arrows anywhere. A chart of data the system does not track is a
 * decoration that looks like information, which is worse than an empty space.
 */
export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const accounts = useAsync(() => accountsApi.list(), [])
  const recent = useAsync(() => transfersApi.history({ size: 10 }), [])
  // Only admins and auditors may read the integrity check, so only they ask for
  // it. Firing it as a teller would return 403 and leave the figures blank in a
  // way that reads as "the ledger is broken" rather than "not your permission".
  const canReadIntegrity = user?.role === 'ADMIN' || user?.role === 'AUDITOR'
  const integrity = useAsync(
    () => (canReadIntegrity ? ledgerApi.integrity() : Promise.resolve(null)),
    [canReadIntegrity],
  )

  const isStaff = user?.role !== 'CUSTOMER'
  const list = useMemo(() => accounts.data ?? [], [accounts.data])
  const total = list.reduce((sum, account) => sum + account.balanceMinorUnits, 0)
  const frozen = list.filter((account) => account.status === 'INACTIVE')
  const closedWithBalance = list.filter(
    (account) => account.status === 'CLOSED' && account.balanceMinorUnits !== 0,
  )

  const columns = useMemo<Column<TransactionSummaryResponse>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        width: '92px',
        render: (row) => (
          <span className="t-row whitespace-nowrap text-ink-2" title={formatDateTime(row.createdAt)}>
            {formatShortDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'reference',
        header: 'Reference',
        render: (row) => (
          <span className="t-row block truncate font-medium text-ink">{row.reference}</span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        width: '110px',
        minWidth: 'lg',
        render: (row) => <Badge>{humanise(row.transactionType)}</Badge>,
      },
      {
        key: 'to',
        header: 'To',
        width: '150px',
        minWidth: 'lg',
        render: (row) => (
          <span className="block min-w-0">
            <span className="t-row block truncate text-ink">
              {counterpartyName(row.creditOwnerUsername)}
            </span>
            <span className="t-micro block truncate">
              {counterpartyDetail(row.creditOwnerUsername, row.creditAccountNumber)}
            </span>
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        width: '120px',
        render: (row) => <Money minorUnits={row.amountMinorUnits} />,
      },
    ],
    [],
  )

  return (
    <PageLayout title={greeting(user?.username)}>
      {accounts.error && (
        <div className="mb-6">
          <ErrorState message={accounts.error} onRetry={accounts.reload} />
        </div>
      )}

      <StatStrip
        className="mb-8"
        stats={[
          {
            label: isStaff ? 'Total on deposit' : 'Total balance',
            value: <Money minorUnits={total} variant="balance" className="t-figure" />,
            note: accounts.loading ? undefined : `Across ${list.length} ${list.length === 1 ? 'account' : 'accounts'}`,
          },
          {
            label: 'Accounts',
            value: <span className="t-figure">{list.length}</span>,
            note: frozen.length > 0 ? `${frozen.length} frozen` : 'All active',
          },
          ...(canReadIntegrity && integrity.data
            ? [
                {
                  label: 'Ledger entries',
                  value: (
                    <span className="t-figure">
                      {integrity.data.ledgerEntryCount.toLocaleString()}
                    </span>
                  ),
                  note: 'Append-only',
                },
                {
                  label: 'Books',
                  value: (
                    <span
                      className={cn(
                        'text-[20px] font-semibold',
                        integrity.data.balanced ? 'text-positive' : 'text-negative',
                      )}
                    >
                      {integrity.data.balanced ? 'Balanced' : 'Out of balance'}
                    </span>
                  ),
                  note: integrity.data.balanced
                    ? 'Every account sums to zero'
                    : 'Debits and credits disagree',
                },
              ]
            : [
                {
                  label: 'Frozen',
                  value: <span className="t-figure">{frozen.length}</span>,
                  note: frozen.length === 0 ? 'Nothing on hold' : 'No money can move',
                },
              ]),
        ]}
      />

      {/* Attention is rendered only when there is something to attend to. A
          permanently present "Attention" panel reading "nothing to report" is
          furniture, and furniture stops being read. */}
      {(frozen.length > 0 || closedWithBalance.length > 0) && (
        <Section title="Needs attention">
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-md border border-line bg-surface">
            {frozen.map((account) => (
              <AttentionRow
                key={account.id}
                to={`/accounts/${account.id}`}
                title={`Account ${account.accountNumber} is frozen`}
                detail="No money can move in or out until it is reactivated."
                account={account}
              />
            ))}
            {closedWithBalance.map((account) => (
              <AttentionRow
                key={account.id}
                to={`/accounts/${account.id}`}
                title={`Closed account ${account.accountNumber} still holds a balance`}
                detail="A closed account should have been emptied before closing."
                account={account}
              />
            ))}
          </ul>
        </Section>
      )}

      {list.length > 0 && (
        <Section
          title={isStaff ? 'Where the money sits' : 'Your accounts'}
          action={
            <Link to="/accounts" className="t-micro hover:text-ink">
              All accounts →
            </Link>
          }
        >
          <Distribution accounts={list} total={total} />
        </Section>
      )}

      <Section
        title="Recent transactions"
        action={
          <Link to="/transactions" className="t-micro hover:text-ink">
            All transactions →
          </Link>
        }
      >
        <AsyncSection
          data={recent.data}
          loading={recent.loading}
          error={recent.error}
          onRetry={recent.reload}
          skeleton={<TableSkeleton rows={6} columns={4} />}
        >
          {(data) => (
            <DataTable
              caption="Recent transactions"
              columns={columns}
              rows={data.items}
              rowKey={(row) => row.transactionId}
              onOpenRow={(row) => navigate(`/transfers/${row.transactionId}`)}
              emptyState={
                <EmptyState
                  title="Nothing has moved yet"
                  description="Transfers, deposits and withdrawals will appear here as they are posted."
                />
              }
            />
          )}
        </AsyncSection>
      </Section>
    </PageLayout>
  )
}

/**
 * The one visualisation in the product: a single stacked bar showing how the
 * total is split across accounts, with the numbers beside it.
 *
 * <p>It earns its place because "where is the money" is a real question that a
 * column of balances answers slowly and a proportion answers instantly. The
 * legend below carries the exact figures, because a bar is for the shape and a
 * table is for the amounts — a chart that has to be squinted at to read a value
 * is doing the table's job badly.
 */
function Distribution({ accounts, total }: { accounts: AccountResponse[]; total: number }) {
  const funded = accounts
    .filter((account) => account.balanceMinorUnits > 0)
    .sort((a, b) => b.balanceMinorUnits - a.balanceMinorUnits)

  if (total <= 0 || funded.length === 0) {
    return (
      <div className="rounded-md border border-line bg-surface">
        <EmptyState
          title="No balances yet"
          description="Once an account is funded, its share of the total appears here."
        />
      </div>
    )
  }

  // A restrained ink ramp rather than a categorical palette. Categorical colour
  // would imply the accounts belong to different kinds; they do not, they are
  // just different sizes, and a ramp says exactly that.
  const shades = ['#1a1a17', '#3f3f38', '#5f5f57', '#7d7d74', '#9b9b91', '#b7b7ad']

  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="px-4 pt-4">
        <div className="flex h-2.5 w-full overflow-hidden rounded-sm">
          {funded.map((account, index) => (
            <span
              key={account.id}
              className="h-full"
              style={{
                width: `${(account.balanceMinorUnits / total) * 100}%`,
                background: shades[Math.min(index, shades.length - 1)],
              }}
              title={`${account.accountNumber}: ${formatMinorUnits(account.balanceMinorUnits, account.currency)}`}
            />
          ))}
        </div>
      </div>
      <table className="mt-4 w-full">
        <caption className="sr-only">Balance by account</caption>
        <tbody>
          {funded.map((account, index) => (
            <tr key={account.id} className="border-t border-line">
              <td className="py-2 pr-3 pl-4 w-4">
                <span
                  aria-hidden="true"
                  className="block h-2.5 w-2.5 rounded-sm"
                  style={{ background: shades[Math.min(index, shades.length - 1)] }}
                />
              </td>
              <td className="py-2 pr-3">
                <Link to={`/accounts/${account.id}`} className="t-row text-ink hover:underline">
                  {account.accountNumber}
                </Link>
                <span className="t-micro ml-2">{account.ownerUsername ?? 'The institution'}</span>
              </td>
              <td className="py-2 pr-3 text-right">
                <span className="t-micro">
                  {((account.balanceMinorUnits / total) * 100).toFixed(1)}%
                </span>
              </td>
              <td className="py-2 pr-4 text-right">
                <Money minorUnits={account.balanceMinorUnits} currency={account.currency} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AttentionRow({
  to,
  title,
  detail,
  account,
}: {
  to: string
  title: string
  detail: string
  account: AccountResponse
}) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-hover">
        <span className="min-w-0">
          <span className="t-row block truncate text-ink">{title}</span>
          <span className="t-micro block truncate">{detail}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Badge tone={statusTone(account.status)}>{statusLabel(account.status)}</Badge>
          <Money
            minorUnits={account.balanceMinorUnits}
            currency={account.currency}
            variant="balance"
          />
        </span>
      </Link>
    </li>
  )
}

/**
 * Time-of-day greeting, using the person's own clock. Warmth in this product
 * comes from language, not from colour.
 */
function greeting(username?: string): string {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return username ? `${part}, ${username}` : part
}
