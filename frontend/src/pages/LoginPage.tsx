import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { API_BASE_URL, extractErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/Field'
import { ErrorState } from '../components/ui/States'
import { DEMO_PASSWORD, DEMO_ROLES, IS_DEMO, type DemoRole } from '../lib/demoRoles'
import { titleCase } from '../lib/text'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/**
 * Sign-in, and — on a demo build — the fastest honest explanation of what this
 * system does.
 *
 * <p>Access control is the most interesting property of a ledger and the least
 * visible one: the same code shows a customer, a teller, an auditor and an
 * administrator materially different products. Listing the four roles with what
 * each is permitted turns a claim into something checkable in about a minute.
 *
 * <p><b>Nothing on this page waits on the API.</b> An earlier version fetched
 * the role list, which meant the explanation of the product arrived after a
 * round trip — and on free hosting, where the service sleeps, that was half a
 * minute of placeholder boxes for the first visitor. The roles are static
 * content describing enforced rules, so they are compiled in and paint with the
 * first frame. The static site itself does not sleep, so the page is immediate
 * regardless of what the backend is doing.
 */
export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  useDocumentTitle('Sign in')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)

  /**
   * Wakes the API while the visitor is still reading.
   *
   * <p>Rendering instantly solves half the problem; the other half is that the
   * first click would then pay the cold start instead. A sleeping instance
   * takes roughly thirty seconds to answer, and the several seconds somebody
   * spends reading four role descriptions is time that can be spent waking it.
   *
   * <p>Deliberately fire-and-forget. Nothing on the page depends on the result,
   * a failure here is not the visitor's problem, and `keepalive` lets it
   * outlive a quick navigation.
   */
  useEffect(() => {
    void fetch(`${API_BASE_URL}/actuator/health`, { mode: 'cors', keepalive: true }).catch(
      () => undefined,
    )
  }, [])

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
          {IS_DEMO && (
            <div>
              <h2 className="t-section mb-1 text-ink">Try it as someone</h2>
              <p className="t-body mb-5 max-w-[58ch] text-ink-2">
                Every role is shown a different system, enforced in the API rather than hidden in
                the interface. Pick one and watch the navigation, the columns and the available
                actions change.
              </p>

              <ul className="overflow-hidden rounded-md border border-line bg-surface">
                {DEMO_ROLES.map((account) => (
                  <li key={account.username} className="border-b border-line last:border-b-0">
                    <RoleRow
                      account={account}
                      busy={submitting && pendingRole === account.username}
                      disabled={submitting}
                      onSignIn={() => {
                        setPendingRole(account.username)
                        void signIn(account.username, DEMO_PASSWORD)
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
  account: DemoRole
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
