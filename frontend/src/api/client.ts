import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from './types'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage'

/**
 * Where the API lives, inlined by Vite at build time.
 *
 * <p>A bare hostname is accepted and assumed to be https. Render's blueprint
 * format can only expose another service's address as a host with no scheme --
 * `penny-api.onrender.com` -- and axios would treat that as a *relative path*,
 * so every request would quietly go to the frontend's own origin and 404.
 * Normalising here is what lets the deployment config stay declarative instead
 * of requiring someone to paste the URL into a dashboard after the first
 * deploy, and then again whenever the service is renamed.
 */
function resolveBaseUrl(raw: string | undefined): string {
  if (!raw) return 'http://localhost:8080'
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (/^https?:\/\//.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export const API_BASE_URL = resolveBaseUrl(import.meta.env.VITE_API_BASE_URL)

/**
 * Repeated query parameters, not bracketed ones.
 *
 * <p>Axios defaults to `type[]=TRANSFER&type[]=DEPOSIT`, which Spring binds to
 * a parameter named "type[]" and therefore silently ignores -- the request
 * succeeds and the filter does nothing, which is worse than an error. Spring
 * expects `type=TRANSFER&type=DEPOSIT`. Undefined and empty values are dropped
 * so an unset filter does not become `q=` and match on the empty string.
 */
function serializeParams(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') search.append(key, String(item))
      }
    } else {
      search.append(key, String(value))
    }
  }
  return search.toString()
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  paramsSerializer: serializeParams,
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshInFlight: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }
  const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
  setTokens(response.data.accessToken, response.data.refreshToken)
  return response.data.accessToken
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      if (error.response?.status === 401) {
        clearTokens()
        window.location.assign('/login')
      }
      return Promise.reject(error)
    }

    // Only one refresh call in flight at a time -- concurrent 401s from
    // several simultaneous requests all await the same promise instead of
    // each firing their own /auth/refresh call.
    originalRequest._retried = true
    try {
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null
      })
      const newAccessToken = await refreshInFlight
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      clearTokens()
      window.location.assign('/login')
      return Promise.reject(refreshError)
    }
  },
)

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    if (data?.message) return data.message
  }
  return 'Something went wrong. Please try again.'
}
