import type { AccountStatus } from '../api/types'

/**
 * One mapping from account status to badge colour, shared by every screen that
 * shows one. Active is neutral on purpose: it is the normal state, and colouring
 * the normal state means the abnormal ones no longer stand out.
 */
export function statusTone(status: AccountStatus): 'neutral' | 'warning' | 'negative' {
  if (status === 'INACTIVE') return 'warning'
  if (status === 'CLOSED') return 'negative'
  return 'neutral'
}

/** "Inactive" is the database's word for it. "Frozen" is what it means. */
export function statusLabel(status: AccountStatus): string {
  return status === 'INACTIVE' ? 'Frozen' : status.charAt(0) + status.slice(1).toLowerCase()
}
