import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountsApi, transfersApi } from '../api/endpoints'
import { extractErrorMessage } from '../api/client'
import type { AccountResponse } from '../api/types'
import { ErrorBanner, PageHeader, Panel } from '../components/Panel'
import { formatMinorUnits } from '../lib/money'

function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

export function TransferPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AccountResponse[]>([])
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    accountsApi.list().then(setAccounts).catch(() => {})
  }, [])

  const source = accounts.find((a) => a.id === Number(sourceAccountId))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const amountMinorUnits = Math.round(Number(amount) * 100)
    if (!Number.isFinite(amountMinorUnits) || amountMinorUnits <= 0) {
      setError('Enter a valid, positive amount.')
      return
    }

    setSubmitting(true)
    try {
      const response = await transfersApi.create(
        {
          sourceAccountId: Number(sourceAccountId),
          destinationAccountId: Number(destinationAccountId),
          amountMinorUnits,
          reference,
        },
        idempotencyKey,
      )
      setSuccess(`Transfer #${response.transactionId} completed.`)
      setIdempotencyKey(newIdempotencyKey())
      setTimeout(() => navigate(`/transfers/${response.transactionId}`), 900)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Transfer money" subtitle="Move funds between two accounts. Every transfer posts a balanced debit and credit." />
      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="mb-4 rounded border border-[var(--color-positive)]/30 bg-[var(--color-positive-muted)] px-4 py-2.5 text-sm text-[var(--color-positive)]">
          {success}
        </div>
      )}

      <Panel>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">From account</label>
            <select
              required
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">Select an account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountNumber} — {formatMinorUnits(a.balanceMinorUnits, a.currency)}
                </option>
              ))}
            </select>
            {source && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Available: {formatMinorUnits(source.balanceMinorUnits, source.currency)}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">To account ID</label>
            <input
              required
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              placeholder="Destination account ID"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Amount</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">$</span>
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2 pl-7 pr-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Reference</label>
            <input
              required
              maxLength={140}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Rent for July"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send transfer'}
          </button>
        </form>
      </Panel>
    </div>
  )
}
