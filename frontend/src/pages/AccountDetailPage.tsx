import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { accountsApi, ledgerApi } from '../api/endpoints'
import { extractErrorMessage } from '../api/client'
import type { AccountResponse, LedgerEntryResponse } from '../api/types'
import { EmptyState, ErrorBanner, PageHeader, Panel } from '../components/Panel'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime, formatMinorUnits } from '../lib/money'

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const accountId = Number(id)
  const [account, setAccount] = useState<AccountResponse | null>(null)
  const [entries, setEntries] = useState<LedgerEntryResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([accountsApi.get(accountId), ledgerApi.forAccount(accountId)])
      .then(([acc, ledgerEntries]) => {
        setAccount(acc)
        setEntries(ledgerEntries)
      })
      .catch((err) => setError(extractErrorMessage(err)))
  }, [accountId])

  return (
    <div>
      <Link to="/accounts" className="mb-3 inline-block text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">
        ← Back to accounts
      </Link>
      {error && <ErrorBanner message={error} />}

      {account && (
        <>
          <PageHeader title={account.accountNumber} subtitle={`${account.accountType} · opened ${formatDateTime(account.createdAt)}`} />

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Balance</div>
              <div className="mt-2 font-figures text-2xl font-semibold text-[var(--color-accent-hover)]">
                {formatMinorUnits(account.balanceMinorUnits, account.currency)}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Status</div>
              <div className="mt-2">
                <StatusBadge value={account.status} />
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Owner</div>
              <div className="mt-2 font-figures text-sm text-[var(--color-text-primary)]">User #{account.ownerUserId}</div>
            </div>
          </div>
        </>
      )}

      <Panel title="Ledger">
        {!entries ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState message="No ledger entries for this account yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Transaction</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5 text-[var(--color-text-secondary)]">{formatDateTime(entry.createdAt)}</td>
                  <td className="py-2.5">
                    <Link
                      to={`/transfers/${entry.transactionId}`}
                      className="font-mono text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                    >
                      #{entry.transactionId}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <StatusBadge value={entry.entryType} />
                  </td>
                  <td className="py-2.5 text-right font-figures text-[var(--color-text-primary)]">
                    {entry.entryType === 'DEBIT' ? '−' : '+'}
                    {formatMinorUnits(entry.amountMinorUnits, account?.currency ?? 'USD')}
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
