import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/Field'
import { ErrorState } from '../components/ui/Surface'

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-grouped)] px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-[15px] bg-[var(--blue)] text-[30px] font-bold text-white shadow-[var(--shadow-raised)]">
            P
          </div>
          <h1 className="t-title1 text-[var(--label)]">Sign in to Penny</h1>
          <p className="t-subhead mt-2 text-[var(--label-secondary)]">Internal transaction ledger</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <ErrorState message={error} />}

          <div className="list-group">
            <div className="list-row list-row-inset relative px-4 py-2.5">
              <TextInput
                label="Username"
                hideLabel
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="bg-transparent px-0 focus:bg-transparent focus:shadow-none"
              />
            </div>
            <div className="list-row list-row-inset relative px-4 py-2.5">
              <TextInput
                label="Password"
                hideLabel
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="bg-transparent px-0 focus:bg-transparent focus:shadow-none"
              />
            </div>
          </div>

          <Button type="submit" variant="filled" size="lg" fullWidth loading={submitting}>
            {submitting ? 'Signing in' : 'Sign in'}
          </Button>
        </form>

        <p className="t-footnote mt-6 text-center text-[var(--label-tertiary)]">
          Accounts are issued by an administrator. There is no self-service signup.
        </p>
      </div>
    </div>
  )
}
