import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accountsApi } from '../api/endpoints'
import { extractErrorMessage } from '../api/client'
import type { AccountResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ErrorBanner, PageHeader, Panel } from '../components/Panel'
import { StatusBadge } from '../components/StatusBadge'
import { formatMinorUnits } from '../lib/money'

export function DashboardPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<AccountResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    accountsApi
      .list()
      .then(setAccounts)
      .catch((err) => setError(extractErrorMessage(err)))
  }, [])

  const totalBalance = accounts?.reduce((sum, a) => sum + a.balanceMinorUnits, 0) ?? 0
  const activeAccounts = accounts?.filter((a) => a.status === 'ACTIVE').length ?? 0

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.username}`} subtitle="Here's what's happening across your accounts." />
      {error && <ErrorBanner message={error} />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Accounts" value={accounts ? String(accounts.length) : '—'} />
        <SummaryCard label="Active" value={accounts ? String(activeAccounts) : '—'} />
        <SummaryCard
          label="Combined balance"
          value={accounts ? formatMinorUnits(totalBalance) : '—'}
          emphasize
        />
      </div>

      <Panel title="Accounts" action={<Link to="/accounts" className="text-xs text-[var(--color-accent)] hover:underline">View all</Link>}>
        {!accounts ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No accounts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="pb-2 font-medium">Account</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.slice(0, 6).map((account) => (
                <tr key={account.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5 font-mono text-[var(--color-text-primary)]">
                    <Link to={`/accounts/${account.id}`} className="hover:text-[var(--color-accent)]">
                      {account.accountNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 text-[var(--color-text-secondary)]">{account.accountType}</td>
                  <td className="py-2.5">
                    <StatusBadge value={account.status} />
                  </td>
                  <td className="py-2.5 text-right font-figures text-[var(--color-text-primary)]">
                    {formatMinorUnits(account.balanceMinorUnits, account.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}

function SummaryCard({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</div>
      <div
        className={`mt-2 font-figures text-2xl font-semibold ${
          emphasize ? 'text-[var(--color-accent-hover)]' : 'text-[var(--color-text-primary)]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
