import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { authApi } from '../api/endpoints'
import type { DemoAccount } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/Field'
import { ErrorState } from '../components/ui/States'
import { titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'

/**
 * Sign-in, and — on a demo instance — the fastest honest explanation of what
 * this system does.
 *
 * <p>Access control is the most interesting property of a ledger and the least
 * visible one: the same code shows a customer, a teller, an auditor and an
 * administrator materially different products. Behind a single login form none
 * of that can be discovered, and a reviewer has to take the README's word for
 * it. Listing the four roles with what each is permitted turns a claim into
 * something checkable in about a minute.
 *
 * <p>The list comes from the server, which publishes it only when the instance
 * was seeded as a demo, so a real deployment renders a plain sign-in form and
 * advertises nothing.
 */
export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)

  // Failing quietly is right here: on a non-demo instance this returns
  // disabled, and if it cannot be reached at all the sign-in form must still
  // work. Nothing on this page depends on it.
  const demo = useAsync(() => authApi.demoAccounts(), [])

  if (user) return <Navigate to="/" replace />

  async function signIn(asUsername: string, asPassword: string) {
    setError(null)
    setSubmitting(true)
    try {
      await login(asUsername, asPassword)
      navigate('/', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
      setPendingRole(null)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void signIn(username, password)
  }

  const demoAccounts = demo.data?.enabled ? demo.data.accounts : []
  const demoPassword = demo.data?.password ?? ''

  return (
    <div className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-[880px]">
        <div className="mb-10 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[14px] font-semibold text-ink-inverse">
            P
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.015em] text-ink">Penny</span>
        </div>

        <div className="grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-16">
          {/* --- Sign in ------------------------------------------------- */}
          <div>
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={submitting && pendingRole === null}
                className="mt-2"
              >
                Sign in
              </Button>
            </form>
          </div>

          {/* --- Roles ---------------------------------------------------- */}
          {demoAccounts.length > 0 && (
            <div>
              <h2 className="t-section mb-1 text-ink">Try it as someone</h2>
              <p className="t-body mb-5 max-w-[58ch] text-ink-2">
                Every role is shown a different system, enforced in the API rather than hidden in
                the interface. Pick one and watch the navigation, the columns and the available
                actions change.
              </p>

              <ul className="overflow-hidden rounded-md border border-line bg-surface">
                {demoAccounts.map((account) => (
                  <li key={account.username} className="border-b border-line last:border-b-0">
                    <RoleRow
                      account={account}
                      busy={submitting && pendingRole === account.username}
                      disabled={submitting}
                      onSignIn={() => {
                        setPendingRole(account.username)
                        void signIn(account.username, demoPassword)
                      }}
                    />
                  </li>
                ))}
              </ul>

              <p className="t-micro mt-3 max-w-[58ch]">
                Demo data. The money is fictional and every account shares one password, shown
                because this instance exists to be looked at. Deposits and withdrawals post
                against a cash vault, so the books stay balanced no matter what you do here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * One role: who they are, what the system lets them do, and a way in.
 *
 * <p>The permissions are listed rather than summarised because the interesting
 * part is the boundary — "cannot move money at all" is what makes the auditor
 * role mean something, and it is the sort of claim a reviewer will want to go
 * and test immediately.
 */
function RoleRow({
  account,
  busy,
  disabled,
  onSignIn,
}: {
  account: DemoAccount
  busy: boolean
  disabled: boolean
  onSignIn: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-ink">{titleCase(account.role)}</span>
          <span className="t-ident text-ink-3">{account.username}</span>
        </div>
        <p className="t-body mt-0.5 text-ink-2">{account.summary}</p>
        <ul className="mt-1.5 space-y-0.5">
          {account.permissions.map((permission) => (
            <li key={permission} className="t-micro flex gap-1.5">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
              {permission}
            </li>
          ))}
        </ul>
      </div>
      <Button
        size="md"
        onClick={onSignIn}
        loading={busy}
        disabled={disabled && !busy}
        className="mt-0.5 shrink-0"
      >
        Sign in
      </Button>
    </div>
  )
}
