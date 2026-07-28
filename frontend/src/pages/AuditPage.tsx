import { useEffect, useState } from 'react'
import { auditApi } from '../api/endpoints'
import { extractErrorMessage } from '../api/client'
import type { AuditLogResponse } from '../api/types'
import { EmptyState, ErrorBanner, PageHeader, Panel } from '../components/Panel'
import { formatDateTime } from '../lib/money'

export function AuditPage() {
  const [entries, setEntries] = useState<AuditLogResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    auditApi
      .list()
      .then(setEntries)
      .catch((err) => setError(extractErrorMessage(err)))
  }, [])

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Every state-changing action, append-only." />
      {error && <ErrorBanner message={error} />}

      <Panel>
        {!entries ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState message="No audit records yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Actor</th>
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Entity</th>
                <th className="pb-2 font-medium">Request ID</th>
                <th className="pb-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5 whitespace-nowrap text-[var(--color-text-secondary)]">{formatDateTime(entry.createdAt)}</td>
                  <td className="py-2.5 font-figures text-[var(--color-text-primary)]">
                    {entry.actorUserId ? `User #${entry.actorUserId}` : '—'}
                  </td>
                  <td className="py-2.5">
                    <span className="rounded bg-[var(--color-surface-3)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-primary)]">
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2.5 text-[var(--color-text-secondary)]">
                    {entry.entityType}
                    {entry.entityId ? ` #${entry.entityId}` : ''}
                  </td>
                  <td className="py-2.5 truncate font-mono text-xs text-[var(--color-text-muted)]" title={entry.requestId}>
                    {entry.requestId.slice(0, 8)}
                  </td>
                  <td className="py-2.5 font-mono text-xs text-[var(--color-text-muted)]">{entry.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
