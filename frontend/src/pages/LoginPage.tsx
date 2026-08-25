import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/Field'
import { ErrorState } from '../components/ui/States'

/**
 * Sign-in. A narrow column on the canvas, with the form's own rules doing the
 * containing — no floating card, because a card here would be a box drawn
 * around the only thing on the screen.
 */
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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-[320px]">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[14px] font-semibold text-ink-inverse">
            P
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.015em] text-ink">Penny</span>
        </div>

        <h1 className="t-page mb-1 text-ink">Sign in</h1>
        <p className="t-body mb-7 text-ink-2">
          A double-entry ledger for the people who keep the books.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="mb-5">
              <ErrorState message={error} />
            </div>
          )}

          <Field label="Username">
            {(id) => (
              <TextInput
                id={id}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            )}
          </Field>

          <Field label="Password">
            {(id) => (
              <TextInput
                id={id}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            )}
          </Field>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting} className="mt-2">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
