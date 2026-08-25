import { Link } from 'react-router-dom'
import { accountsApi, transfersApi } from '../api/endpoints'
import type { AccountResponse, TransactionSummaryResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { IconAccounts, IconPlus, IconTransfer } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/Surface'
import { formatAccountNumber, formatDate, formatMinorUnits } from '../lib/money'
import { useAsync } from '../lib/useAsync'

export function DashboardPage() {
  const { user } = useAuth()
  const accounts = useAsync(() => accountsApi.list(), [])
  const activity = useAsync(() => transfersApi.history({ size: 6 }), [])

  const isStaff = user?.role !== 'CUSTOMER'
  const list = accounts.data ?? []
  const totalBalance = list.reduce((sum, a) => sum + a.balanceMinorUnits, 0)
  const activeCount = list.filter((a) => a.status === 'ACTIVE').length

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${user?.username}`}
        description={
          isStaff
            ? 'Institution-wide position across every customer account.'
            : 'Your accounts and recent activity at a glance.'
        }
        action={
          user?.role !== 'AUDITOR' && (
            <Button variant="primary" iconLeft={<IconTransfer className="h-4 w-4" />} asLink="/transfer">
              Send money
            </Button>
          )
        }
      />

      {accounts.error && <ErrorState message={accounts.error} onRetry={accounts.reload} />}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label={isStaff ? 'Total on deposit' : 'Total balance'}
          value={accounts.loading ? null : formatMinorUnits(totalBalance)}
          emphasis
        />
        <Stat label="Accounts" value={accounts.loading ? null : String(list.length)} />
        <Stat label="Active" value={accounts.loading ? null : String(activeCount)} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card padded={false}>
          <CardHeader
            title="Accounts"
            action={
              <Link
                to="/accounts"
                className="t-caption font-medium text-[var(--accent-fg)] transition-opacity hover:opacity-75"
              >
                View all
              </Link>
            }
          />
          <DataTable
            caption="Accounts"
            columns={ACCOUNT_COLUMNS}
            rows={list.slice(0, 5)}
            rowKey={(a) => a.id}
            loading={accounts.loading}
            skeletonRows={3}
            empty={
              <EmptyState
                icon={<IconAccounts className="h-5 w-5" />}
                title="No accounts yet"
                description={
                  isStaff
                    ? 'Open an account for a customer to start recording transactions against it.'
                    : 'Your accounts will appear here once a teller opens one for you.'
                }
                action={
                  isStaff && (
                    <Button variant="secondary" iconLeft={<IconPlus className="h-4 w-4" />} asLink="/accounts">
                      Open an account
                    </Button>
                  )
                }
              />
            }
          />
        </Card>

        <Card padded={false}>
          <CardHeader
            title="Recent activity"
            action={
              <Link
                to="/activity"
                className="t-caption font-medium text-[var(--accent-fg)] transition-opacity hover:opacity-75"
              >
                View all
              </Link>
            }
          />
          <DataTable
            caption="Recent transactions"
            columns={ACTIVITY_COLUMNS}
            rows={activity.data?.items ?? []}
            rowKey={(t) => t.transactionId}
            loading={activity.loading}
            skeletonRows={3}
            empty={
              <EmptyState
                icon={<IconTransfer className="h-5 w-5" />}
                title="Nothing has moved yet"
                description="Deposits, withdrawals and transfers will show up here as soon as they are posted."
              />
            }
          />
        </Card>
      </div>
    </div>
  )
}

const ACCOUNT_COLUMNS: Column<AccountResponse>[] = [
  {
    key: 'number',
    header: 'Account',
    primary: true,
    render: (a) => (
      <Link
        to={`/accounts/${a.id}`}
        className="t-figure text-[0.875rem] text-[var(--text-primary)] transition-colors hover:text-[var(--accent-fg)]"
      >
        {formatAccountNumber(a.accountNumber)}
      </Link>
    ),
  },
  { key: 'type', header: 'Type', render: (a) => <span className="t-caption text-[var(--text-secondary)]">{a.accountType}</span> },
  { key: 'status', header: 'Status', secondary: true, render: (a) => <Badge>{a.status}</Badge> },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    render: (a) => (
      <span className="t-figure whitespace-nowrap text-[0.875rem] text-[var(--text-primary)]">
        {formatMinorUnits(a.balanceMinorUnits, a.currency)}
      </span>
    ),
  },
]

const ACTIVITY_COLUMNS: Column<TransactionSummaryResponse>[] = [
  {
    key: 'reference',
    header: 'Reference',
    primary: true,
    render: (t) => <span className="text-[var(--text-primary)]">{t.reference}</span>,
  },
  { key: 'type', header: 'Type', secondary: true, render: (t) => <Badge>{t.transactionType}</Badge> },
  { key: 'date', header: 'Date', render: (t) => <span className="t-caption whitespace-nowrap text-[var(--text-tertiary)]">{formatDate(t.createdAt)}</span> },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (t) => <span className="t-figure whitespace-nowrap text-[0.875rem] text-[var(--text-primary)]">{formatMinorUnits(t.amountMinorUnits)}</span>,
  },
]

function Stat({ label, value, emphasis }: { label: string; value: string | null; emphasis?: boolean }) {
  return (
    <Card>
      <p className="t-label text-[var(--text-tertiary)]">{label}</p>
      {value === null ? (
        <Skeleton className="mt-2.5 h-7 w-32" />
      ) : (
        <p
          className={`t-figure mt-2 ${
            emphasis ? 'text-[1.625rem] font-semibold text-[var(--text-primary)]' : 'text-[1.375rem] text-[var(--text-primary)]'
          }`}
        >
          {value}
        </p>
      )}
    </Card>
  )
}
