export type Role = 'CUSTOMER' | 'TELLER' | 'AUDITOR' | 'ADMIN'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  tokenType: string
}

export interface UserResponse {
  id: number
  username: string
  email: string
  role: Role
  enabled: boolean
  createdAt: string
}

export type AccountType = 'CHECKING' | 'SAVINGS' | 'SYSTEM'
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED'

export interface AccountResponse {
  id: number
  accountNumber: string
  ownerUserId: number | null
  ownerUsername: string | null
  accountType: AccountType
  status: AccountStatus
  currency: string
  balanceMinorUnits: number
  createdAt: string
}

export type EntryType = 'DEBIT' | 'CREDIT'

export interface LedgerEntryResponse {
  id: number
  transactionId: number
  accountId: number
  entryType: EntryType
  amountMinorUnits: number
  /**
   * The account balance immediately after this entry, accumulated over the
   * account's whole history. Null when the entries were not requested as one
   * account's sequence -- the two legs of a single transfer sit on different
   * accounts and share no running total.
   */
  runningBalanceMinorUnits: number | null
  createdAt: string
}

export type TransactionType = 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL'

export interface TransferResponse {
  transactionId: number
  transactionType: TransactionType
  sourceAccountId: number
  sourceAccountNumber: string
  destinationAccountId: number
  destinationAccountNumber: string
  amountMinorUnits: number
  reference: string
  createdAt: string
}

export interface TransactionSummaryResponse {
  transactionId: number
  transactionType: TransactionType
  reference: string
  amountMinorUnits: number
  debitAccountId: number
  debitAccountNumber: string
  /** Null for the cash vault, which is bank-owned and has no holder. */
  debitOwnerUsername: string | null
  creditAccountId: number
  creditAccountNumber: string
  creditOwnerUsername: string | null
  initiatedByUserId: number | null
  initiatedByUsername: string | null
  createdAt: string
}

/** Sortable columns on the transaction list. Mirrors the backend enum. */
export type TransactionSort = 'DATE' | 'AMOUNT'
export type SortDirection = 'ASC' | 'DESC'

export interface TransactionQuery {
  accountId?: number
  q?: string
  type?: TransactionType[]
  from?: string
  to?: string
  minAmount?: number
  maxAmount?: number
  sort?: TransactionSort
  direction?: SortDirection
  page?: number
  size?: number
}

export interface AuditQuery {
  action?: string
  entityType?: string
  entityId?: string
  actorUserId?: number
  from?: string
  to?: string
  page?: number
  size?: number
}

export interface CashResponse {
  transactionId: number
  transactionType: TransactionType
  accountId: number
  amountMinorUnits: number
  resultingBalanceMinorUnits: number
  reference: string
  createdAt: string
}

export interface AuditLogResponse {
  id: number
  actorUserId: number | null
  actorUsername: string | null
  action: string
  entityType: string
  entityId: string | null
  requestId: string
  ipAddress: string
  details: string | null
  createdAt: string
}

export interface LedgerIntegrityResponse {
  balanced: boolean
  totalDebitsMinorUnits: number
  totalCreditsMinorUnits: number
  netAcrossAllAccountsMinorUnits: number
  ledgerEntryCount: number
}

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface ApiErrorResponse {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors: { field: string; message: string }[]
}

/** Demo logins, published only by an instance seeded as a demo. */
export interface DemoAccount {
  username: string
  role: Role
  summary: string
  permissions: string[]
}

export interface DemoAccountsResponse {
  enabled: boolean
  password: string | null
  accounts: DemoAccount[]
}
