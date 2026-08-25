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
  creditAccountId: number
  creditAccountNumber: string
  createdAt: string
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
