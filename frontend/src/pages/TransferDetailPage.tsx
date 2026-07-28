import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { transfersApi } from '../api/endpoints'
import { extractErrorMessage } from '../api/client'
import type { TransferResponse } from '../api/types'
import { ErrorBanner, PageHeader, Panel } from '../components/Panel'
import { formatDateTime, formatMinorUnits } from '../lib/money'

export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [transfer, setTransfer] = useState<TransferResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    transfersApi
      .get(Number(id))
      .then(setTransfer)
      .catch((err) => setError(extractErrorMessage(err)))
  }, [id])

  return (
    <div className="max-w-lg">
      <Link to="/accounts" className="mb-3 inline-block text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">
        ← Back
      </Link>
      {error && <ErrorBanner message={error} />}
      <PageHeader title={`Transfer #${id}`} />

      {transfer && (
        <Panel>
          <dl className="space-y-3 text-sm">
            <Row label="Amount" value={formatMinorUnits(transfer.amountMinorUnits)} emphasize />
            <Row label="Reference" value={transfer.reference} />
            <Row
              label="From account"
              value={
                <Link to={`/accounts/${transfer.sourceAccountId}`} className="font-mono hover:text-[var(--color-accent)]">
                  Account #{transfer.sourceAccountId}
                </Link>
              }
            />
            <Row
              label="To account"
              value={
                <Link to={`/accounts/${transfer.destinationAccountId}`} className="font-mono hover:text-[var(--color-accent)]">
                  Account #{transfer.destinationAccountId}
                </Link>
              }
            />
            <Row label="Posted" value={formatDateTime(transfer.createdAt)} />
          </dl>
        </Panel>
      )}
    </div>
  )
}

function Row({ label, value, emphasize }: { label: string; value: ReactNode; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd className={`font-figures ${emphasize ? 'text-lg font-semibold text-[var(--color-accent-hover)]' : 'text-[var(--color-text-primary)]'}`}>
        {value}
      </dd>
    </div>
  )
}
