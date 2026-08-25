import type { Role } from './types'

/**
 * Tokens live in localStorage so a page refresh doesn't log the user out.
 * That is a deliberate tradeoff for a demo app: it is readable by any
 * script on the page, which is not what you'd accept in a production
 * bank -- there, the refresh token belongs in an httpOnly cookie and the
 * access token stays in memory only. See README "Future Improvements".
 */
const ACCESS_TOKEN_KEY = 'penny.accessToken'
const REFRESH_TOKEN_KEY = 'penny.refreshToken'

export interface DecodedToken {
  sub: string
  uid: number
  role: Role
  exp: number
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function decodeAccessToken(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as DecodedToken
  } catch {
    return null
  }
}
