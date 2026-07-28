import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/endpoints'
import { clearTokens, decodeAccessToken, getAccessToken, setTokens } from '../api/tokenStorage'
import type { Role } from '../api/types'

interface CurrentUser {
  id: number
  username: string
  role: Role
}

interface AuthContextValue {
  user: CurrentUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function userFromStoredToken(): CurrentUser | null {
  const token = getAccessToken()
  if (!token) return null
  const decoded = decodeAccessToken(token)
  if (!decoded || decoded.exp * 1000 < Date.now()) return null
  return { id: decoded.uid, username: decoded.sub, role: decoded.role }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(userFromStoredToken)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (username, password) => {
        const response = await authApi.login(username, password)
        setTokens(response.accessToken, response.refreshToken)
        const decoded = decodeAccessToken(response.accessToken)
        if (decoded) {
          setUser({ id: decoded.uid, username: decoded.sub, role: decoded.role })
        }
      },
      logout: () => {
        clearTokens()
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
