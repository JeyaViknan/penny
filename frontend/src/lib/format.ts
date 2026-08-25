/**
 * Display helpers shared by every table.
 *
 * <p>These exist because the same three formatting decisions were previously
 * made independently on each page, and they drifted: the account number was
 * masked three different ways, and `titleCase` had three implementations.
 */

/**
 * Account numbers are 12 digits and nobody reads all of them. The last four are
 * what people actually use to tell accounts apart, so that is what a table
 * shows; the full number stays available in the detail panel and in a title
 * attribute.
 */
export function maskAccount(accountNumber: string): string {
  return '····' + accountNumber.slice(-4)
}

/** Short date for a table column: "26 Aug". The year appears only when it differs. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** Time of day, for the audit trail where ordering within a day matters. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * The cash vault is a bank-owned system account. Showing its raw twelve-digit
 * number in a counterparty column is meaningless to every reader, so a deposit
 * reads as coming from "Cash vault" and a withdrawal as going to it.
 */
export function counterpartyName(username: string | null): string {
  return username ?? 'Cash vault'
}

export function counterpartyDetail(username: string | null, accountNumber: string): string {
  return username ? maskAccount(accountNumber) : 'System account'
}
