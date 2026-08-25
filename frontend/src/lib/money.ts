/**
 * Every amount crossing the API is an integer count of minor units (cents,
 * paise). Conversion to a decimal happens only at the moment of display -- the
 * value is never stored or sent as a float, because binary floating point
 * cannot represent most decimal money values exactly.
 */
export function formatMinorUnits(minorUnits: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minorUnits / 100)
}

/** Explicit sign for ledger movements, where direction matters more than magnitude. */
export function formatSigned(minorUnits: number, currency = 'USD'): string {
  const sign = minorUnits < 0 ? '−' : '+'
  return sign + formatMinorUnits(Math.abs(minorUnits), currency)
}

/**
 * Parses user-typed major units into minor units.
 *
 * <p>Rounds rather than truncates, and rejects anything that is not a clean
 * number, so "12.005" cannot silently become a different amount than the person
 * intended. Returns null for input the caller should refuse.
 */
export function parseMajorUnits(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, '')
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '' || trimmed === '.') return null
  const asNumber = Number(trimmed)
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null
  // More than two decimal places is ambiguous for currency; reject rather than round.
  const decimals = trimmed.split('.')[1]
  if (decimals && decimals.length > 2) return null
  return Math.round(asNumber * 100)
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Account numbers are long and uniform; grouping makes them scannable and easier to read aloud. */
export function formatAccountNumber(accountNumber: string): string {
  return accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/**
 * Which side of a transaction is the institution's cash vault.
 *
 * <p>Derived from the transaction type rather than by matching the vault's
 * account number, because the backend guarantees the shape: a deposit always
 * debits the vault and credits the customer, a withdrawal always does the
 * reverse. Showing the raw vault number to a user is meaningless -- they think
 * in terms of "cash", not the counterparty account that keeps the books
 * balanced.
 */
export function isVaultSide(
  transactionType: 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL',
  side: 'debit' | 'credit',
): boolean {
  if (transactionType === 'DEPOSIT') return side === 'debit'
  if (transactionType === 'WITHDRAWAL') return side === 'credit'
  return false
}

/**
 * Dates as a person would say them. "Today" and "Yesterday" carry more meaning
 * at a glance than a formatted date, which is how Wallet labels recent activity;
 * anything older falls back to a real date.
 */
export function formatRelativeDate(iso: string): string {
  const then = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.floor((startOfToday.getTime() - new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) / 86_400_000)

  if (days === 0) return `Today at ${then.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  if (days === 1) return 'Yesterday'
  if (days < 7) return then.toLocaleDateString('en-US', { weekday: 'long' })
  if (then.getFullYear() === now.getFullYear()) return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
