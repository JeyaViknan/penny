import { accountsApi, transfersApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { TotalCard } from '../components/BalanceCard'
import { IconAccounts, IconTransfer } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { RowSkeletons, TransactionRow } from '../components/TransactionRow'
import { Glyph, ListRow, ListSection } from '../components/ui/List'
import { EmptyState, ErrorState, PageHeader } from '../components/ui/Surface'
import { formatMinorUnits } from '../lib/money'
import { titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'

export function DashboardPage() {
  const { user } = useAuth()
  const accounts = useAsync(() => accountsApi.list(), [])
  const activity = useAsync(() => transfersApi.history({ size: 5 }), [])

  const isStaff = user?.role !== 'CUSTOMER'
  const list = accounts.data ?? []
  const total = list.reduce((sum, a) => sum + a.balanceMinorUnits, 0)

  return (
    <div>
      <PageHeader title={greeting(user?.username)} />

      <div className="mb-8 px-4 sm:px-0">
        <TotalCard
          label={isStaff ? 'Total on deposit' : 'Total balance'}
          amountMinorUnits={total}
          caption={
            accounts.loading
              ? undefined
              : `Across ${list.length} ${list.length === 1 ? 'account' : 'accounts'}${isStaff ? ' on the books' : ''}`
          }
          loading={accounts.loading}
        />
      </div>

      {accounts.error && (
        <div className="mb-6 px-4 sm:px-0">
          <ErrorState message={accounts.error} onRetry={accounts.reload} />
        </div>
      )}

      {user?.role !== 'AUDITOR' && (
        <div className="mb-8 px-4 sm:px-0">
          <Button variant="filled" size="lg" fullWidth asLink="/transfer">
            Send money
          </Button>
        </div>
      )}

      <ListSection
        header="Accounts"
        action={
          <a href="/accounts" className="t-subhead font-medium text-[var(--blue)] active:opacity-55">
            See all
          </a>
        }
      >
        {accounts.loading ? (
          <RowSkeletons count={2} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<IconAccounts className="h-6 w-6" />}
            title="No accounts yet"
            description={
              isStaff
                ? 'Open an account for a customer to start recording transactions against it.'
                : 'Your accounts will appear here once a teller opens one for you.'
            }
          />
        ) : (
          list.slice(0, 4).map((account) => (
            <ListRow
              key={account.id}
              to={`/accounts/${account.id}`}
              leading={
                <Glyph tone={account.accountType === 'SAVINGS' ? 'indigo' : 'blue'}>
                  <IconAccounts className="h-[18px] w-[18px]" />
                </Glyph>
              }
              title={titleCase(account.accountType)}
              subtitle={`···· ${account.accountNumber.slice(-4)}`}
              value={
                <span className="t-money">{formatMinorUnits(account.balanceMinorUnits, account.currency)}</span>
              }
            />
          ))
        )}
      </ListSection>

      <ListSection
        header="Recent activity"
        action={
          <a href="/activity" className="t-subhead font-medium text-[var(--blue)] active:opacity-55">
            See all
          </a>
        }
      >
        {activity.loading ? (
          <RowSkeletons count={3} />
        ) : (activity.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<IconTransfer className="h-6 w-6" />}
            title="Nothing has moved yet"
            description="Deposits, withdrawals and transfers appear here as soon as they are posted."
          />
        ) : (
          activity.data!.items.map((t) => <TransactionRow key={t.transactionId} transaction={t} />)
        )}
      </ListSection>
    </div>
  )
}

/** Time-aware greeting, the way Apple's own apps address you by moment of day. */
function greeting(username?: string): string {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return username ? `${part}, ${username}` : part
}
