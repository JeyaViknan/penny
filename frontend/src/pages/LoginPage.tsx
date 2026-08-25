import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Field'
import { ErrorState } from '../components/ui/Surface'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-canvas)]">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[22rem]">
          <div className="mb-9 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent)] text-sm font-bold text-[var(--accent-text)]">
              LL
            </div>
            <h1 className="t-title text-[var(--text-primary)]">Sign in to LedgerLite</h1>
            <p className="t-body mt-1.5 text-[var(--text-secondary)]">Internal transaction ledger</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && <ErrorState message={error} />}

            <TextInput
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
            <TextInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting} className="mt-2">
              {submitting ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          <p className="t-caption mt-6 text-center text-[var(--text-tertiary)]">
            Accounts are issued by an administrator. There is no self-service signup.
          </p>
        </div>
      </div>

      <footer className="flex justify-center pb-8">
        <ThemeToggle />
      </footer>
    </div>
  )
}
