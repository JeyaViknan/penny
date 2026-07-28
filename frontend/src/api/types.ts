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

export type AccountType = 'CHECKING' | 'SAVINGS'
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED'

export interface AccountResponse {
  id: number
  accountNumber: string
  ownerUserId: number
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

export interface TransferResponse {
  transactionId: number
  sourceAccountId: number
  destinationAccountId: number
  amountMinorUnits: number
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

export interface ApiErrorResponse {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors: { field: string; message: string }[]
}
