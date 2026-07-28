import { apiClient } from './client'
import type {
  AccountResponse,
  AuditLogResponse,
  AuthResponse,
  LedgerEntryResponse,
  TransferResponse,
  UserResponse,
} from './types'

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data),
}

export const usersApi = {
  list: () => apiClient.get<UserResponse[]>('/users').then((r) => r.data),
  get: (id: number) => apiClient.get<UserResponse>(`/users/${id}`).then((r) => r.data),
  create: (payload: { username: string; email: string; password: string; role: string }) =>
    apiClient.post<UserResponse>('/users', payload).then((r) => r.data),
}

export const accountsApi = {
  list: () => apiClient.get<AccountResponse[]>('/accounts').then((r) => r.data),
  get: (id: number) => apiClient.get<AccountResponse>(`/accounts/${id}`).then((r) => r.data),
  create: (payload: { ownerUserId: number; accountType: string; currency: string }) =>
    apiClient.post<AccountResponse>('/accounts', payload).then((r) => r.data),
}

export const ledgerApi = {
  forAccount: (accountId: number) =>
    apiClient.get<LedgerEntryResponse[]>(`/ledger/${accountId}`).then((r) => r.data),
}

export const transfersApi = {
  create: (
    payload: { sourceAccountId: number; destinationAccountId: number; amountMinorUnits: number; reference: string },
    idempotencyKey: string,
  ) =>
    apiClient
      .post<TransferResponse>('/transfers', payload, { headers: { 'Idempotency-Key': idempotencyKey } })
      .then((r) => r.data),
  get: (id: number) => apiClient.get<TransferResponse>(`/transfers/${id}`).then((r) => r.data),
}

export const auditApi = {
  list: () => apiClient.get<AuditLogResponse[]>('/audit').then((r) => r.data),
}
