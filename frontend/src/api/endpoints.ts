import { apiClient } from './client'
import type {
  AccountResponse,
  AccountStatus,
  AuditLogResponse,
  AuditQuery,
  AuthResponse,
  DemoAccountsResponse,
  CashResponse,
  LedgerEntryResponse,
  LedgerIntegrityResponse,
  PageResponse,
  Role,
  TransactionQuery,
  TransactionSummaryResponse,
  TransferResponse,
  UserResponse,
} from './types'

/**
 * Every request that moves money carries a fresh Idempotency-Key, generated
 * per attempt. This is what makes a double-submit or a retry after a dropped
 * connection safe: the server recognises the replay and returns the original
 * result rather than posting a second transaction.
 */
function idempotencyKey(): string {
  return crypto.randomUUID()
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data),
  /** Demo logins. Resolves to a disabled response on a non-demo instance. */
  demoAccounts: () =>
    apiClient.get<DemoAccountsResponse>('/auth/demo').then((r) => r.data),
}

export const usersApi = {
  list: () => apiClient.get<UserResponse[]>('/users').then((r) => r.data),
  get: (id: number) => apiClient.get<UserResponse>(`/users/${id}`).then((r) => r.data),
  create: (payload: { username: string; email: string; password: string; role: Role }) =>
    apiClient.post<UserResponse>('/users', payload).then((r) => r.data),
}

export const accountsApi = {
  list: () => apiClient.get<AccountResponse[]>('/accounts').then((r) => r.data),
  get: (id: number) => apiClient.get<AccountResponse>(`/accounts/${id}`).then((r) => r.data),
  create: (payload: { ownerUserId: number; accountType: string; currency: string }) =>
    apiClient.post<AccountResponse>('/accounts', payload).then((r) => r.data),
  changeStatus: (id: number, status: AccountStatus) =>
    apiClient.patch<AccountResponse>(`/accounts/${id}/status`, { status }).then((r) => r.data),
  deposit: (id: number, payload: { amountMinorUnits: number; reference: string }) =>
    apiClient
      .post<CashResponse>(`/accounts/${id}/deposit`, payload, { headers: { 'Idempotency-Key': idempotencyKey() } })
      .then((r) => r.data),
  withdraw: (id: number, payload: { amountMinorUnits: number; reference: string }) =>
    apiClient
      .post<CashResponse>(`/accounts/${id}/withdraw`, payload, { headers: { 'Idempotency-Key': idempotencyKey() } })
      .then((r) => r.data),
}

export const ledgerApi = {
  /** One account's postings, newest first, each carrying the balance after it. */
  forAccount: (accountId: number, params: { page?: number; size?: number } = {}) =>
    apiClient
      .get<PageResponse<LedgerEntryResponse>>(`/ledger/${accountId}`, { params })
      .then((r) => r.data),
  /** Both legs of one transaction -- the debit and the credit side. Staff only. */
  forTransaction: (transactionId: number) =>
    apiClient.get<LedgerEntryResponse[]>(`/ledger/transaction/${transactionId}`).then((r) => r.data),
  integrity: () => apiClient.get<LedgerIntegrityResponse>('/ledger/integrity').then((r) => r.data),
}

export const transfersApi = {
  create: (payload: {
    sourceAccountId: number
    destinationAccountId: number
    amountMinorUnits: number
    reference: string
  }) =>
    apiClient
      .post<TransferResponse>('/transfers', payload, { headers: { 'Idempotency-Key': idempotencyKey() } })
      .then((r) => r.data),
  get: (id: number) => apiClient.get<TransferResponse>(`/transfers/${id}`).then((r) => r.data),
  history: (params: TransactionQuery = {}) =>
    apiClient
      .get<PageResponse<TransactionSummaryResponse>>('/transfers', { params })
      .then((r) => r.data),
}

export const auditApi = {
  search: (params: AuditQuery = {}) =>
    apiClient.get<PageResponse<AuditLogResponse>>('/audit', { params }).then((r) => r.data),
}
