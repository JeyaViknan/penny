import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { accountsApi } from '../api/endpoints'
import { extractErrorMessage } from '../api/client'
import type { AccountResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorBanner, PageHeader, Panel } from '../components/Panel'
import { StatusBadge } from '../components/StatusBadge'
import { formatMinorUnits } from '../lib/money'

export function AccountsPage() {
  const { user } = useAuth()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'TELLER'
  const [accounts, setAccounts] = useState<AccountResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  function reload() {
    accountsApi
      .list()
      .then(setAccounts)
      .catch((err) => setError(extractErrorMessage(err)))
  }

  useEffect(reload, [])

  return (
    <div>
      <PageHeader title="Accounts" subtitle="All accounts you have access to." />
      {error && <ErrorBanner message={error} />}

      {canCreate && (
        <div className="mb-4">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
          >
            {showForm ? 'Cancel' : '+ Open account'}
          </button>
          {showForm && <NewAccountForm onCreated={() => { setShowForm(false); reload() }} />}
        </div>
      )}

      <Panel>
        {!accounts ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : accounts.length === 0 ? (
          <EmptyState message="No accounts to show." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="pb-2 font-medium">Account number</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Currency</th>
                <th className="pb-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5">
                    <Link
                      to={`/accounts/${account.id}`}
                      className="font-mono text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                    >
                      {account.accountNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 text-[var(--color-text-secondary)]">{account.accountType}</td>
                  <td className="py-2.5">
                    <StatusBadge value={account.status} />
                  </td>
                  <td className="py-2.5 text-[var(--color-text-secondary)]">{account.currency}</td>
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

function NewAccountForm({ onCreated }: { onCreated: () => void }) {
  const [ownerUserId, setOwnerUserId] = useState('')
  const [accountType, setAccountType] = useState('CHECKING')
  const [currency, setCurrency] = useState('USD')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await accountsApi.create({ ownerUserId: Number(ownerUserId), accountType, currency })
      onCreated()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
      {error && <div className="w-full text-sm text-[var(--color-negative)]">{error}</div>}
      <Field label="Owner user ID">
        <input
          required
          value={ownerUserId}
          onChange={(e) => setOwnerUserId(e.target.value)}
          className="w-32 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
        />
      </Field>
      <Field label="Type">
        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
        >
          <option value="CHECKING">Checking</option>
          <option value="SAVINGS">Savings</option>
        </select>
      </Field>
      <Field label="Currency">
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          maxLength={3}
          className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
        />
      </Field>
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create'}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      {children}
    </label>
  )
}
