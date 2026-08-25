import { useMemo, useState, type FormEvent } from 'react'
import { extractErrorMessage } from '../api/client'
import { accountsApi, usersApi } from '../api/endpoints'
import type { AccountResponse, Role, UserResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageLayout } from '../components/layout/PageLayout'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Field, Select, TextInput } from '../components/ui/Field'
import { Money } from '../components/ui/Money'
import { Drawer, Modal } from '../components/ui/Overlay'
import { AsyncSection, EmptyState, ErrorState, TableSkeleton } from '../components/ui/States'
import { ClearFilters, FilterSelect, SearchInput, Toolbar } from '../components/ui/Toolbar'
import { useToast } from '../components/ui/Toast'
import { formatShortDate } from '../lib/format'
import { formatDateTime } from '../lib/money'
import { titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'
import { statusLabel, statusTone } from './accountStatus'

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  CUSTOMER: 'Sees only their own accounts and transfers.',
  TELLER: 'Opens accounts and moves money on behalf of customers.',
  AUDITOR: 'Read-only access to everything, including the audit trail.',
  ADMIN: 'Full access, including account status and user management.',
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  CUSTOMER: ['Read their own accounts', 'Send money from their own accounts'],
  TELLER: ['Open accounts', 'Record deposits and withdrawals', 'Post transfers', 'Read all accounts'],
  AUDITOR: ['Read every account and transaction', 'Read the audit trail', 'Cannot move money'],
  ADMIN: ['Everything a teller can do', 'Freeze, reactivate and close accounts', 'Add people', 'Read the audit trail'],
}

const ROLE_OPTIONS = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'TELLER', label: 'Teller' },
  { value: 'AUDITOR', label: 'Auditor' },
  { value: 'ADMIN', label: 'Administrator' },
]

/**
 * An access directory, not a contact list.
 *
 * <p>The people in Penny are operators of a ledger, and the question worth
 * answering about each of them is what the system lets them do — so the columns
 * are role, accounts and status, and the detail panel spells out the
 * permissions the role actually grants rather than leaving "Teller" to be
 * interpreted. Everything on this screen is an IAM question.
 */
export function PeoplePage() {
  const { user } = useAuth()
  const people = useAsync(() => usersApi.list(), [])
  // Loaded once and joined client-side. Every person's account count comes from
  // the same list, so this is one request rather than one per row.
  const accounts = useAsync(() => accountsApi.list(), [])

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<UserResponse | null>(null)

  const isAdmin = user?.role === 'ADMIN'

  const accountsByOwner = useMemo(() => {
    const map = new Map<number, AccountResponse[]>()
    for (const account of accounts.data ?? []) {
      if (account.ownerUserId === null) continue
      const list = map.get(account.ownerUserId) ?? []
      list.push(account)
      map.set(account.ownerUserId, list)
    }
    return map
  }, [accounts.data])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (people.data ?? []).filter((person) => {
      if (role && person.role !== role) return false
      if (!term) return true
      return (
        person.username.toLowerCase().includes(term) || person.email.toLowerCase().includes(term)
      )
    })
  }, [people.data, search, role])

  const columns = useMemo<Column<UserResponse>[]>(
    () => [
      {
        key: 'person',
        header: 'Person',
        render: (row) => (
          <span className="t-row block truncate font-medium text-ink">{row.username}</span>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        minWidth: 'lg',
        render: (row) => <span className="t-row block truncate text-ink-2">{row.email}</span>,
      },
      {
        key: 'role',
        header: 'Role',
        width: '120px',
        render: (row) => <Badge>{titleCase(row.role)}</Badge>,
      },
      {
        key: 'accounts',
        header: 'Accounts',
        align: 'right',
        width: '90px',
        render: (row) => (
          <span className="t-row text-ink-2">{accountsByOwner.get(row.id)?.length ?? 0}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: '90px',
        render: (row) => (
          <Badge tone={row.enabled ? 'neutral' : 'negative'}>{row.enabled ? 'Active' : 'Disabled'}</Badge>
        ),
      },
      {
        key: 'joined',
        header: 'Joined',
        width: '110px',
        minWidth: 'xl',
        render: (row) => (
          <span className="t-row text-ink-2" title={formatDateTime(row.createdAt)}>
            {formatShortDate(row.createdAt)}
          </span>
        ),
      },
    ],
    [accountsByOwner],
  )

  const filtered = Boolean(search || role)

  return (
    <>
      <PageLayout
        title="People"
        actions={isAdmin && <Button onClick={() => setCreating(true)}>Add person</Button>}
        toolbar={
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or email" />
            <FilterSelect label="Role" value={role} onChange={setRole} options={ROLE_OPTIONS} />
            <ClearFilters
              show={filtered}
              onClear={() => {
                setSearch('')
                setRole('')
              }}
            />
          </Toolbar>
        }
      >
        <AsyncSection
          data={people.data}
          loading={people.loading}
          error={people.error}
          onRetry={people.reload}
          skeleton={<TableSkeleton rows={6} columns={5} />}
        >
          {() => (
            <DataTable
              caption="People"
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              onOpenRow={setSelected}
              selectedKey={selected?.id ?? null}
              emptyState={
                <EmptyState
                  title={filtered ? 'Nobody matches those filters' : 'No people yet'}
                  description={
                    filtered ? 'Clear the filters to see everyone.' : 'Add the first person to get started.'
                  }
                />
              }
              footer={
                <p className="t-micro">
                  {rows.length.toLocaleString()} {rows.length === 1 ? 'person' : 'people'}
                </p>
              }
            />
          )}
        </AsyncSection>
      </PageLayout>

      <PersonDrawer
        person={selected}
        accounts={selected ? (accountsByOwner.get(selected.id) ?? []) : []}
        onClose={() => setSelected(null)}
      />

      <AddPersonModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false)
          people.reload()
        }}
      />
    </>
  )
}

function PersonDrawer({
  person,
  accounts,
  onClose,
}: {
  person: UserResponse | null
  accounts: AccountResponse[]
  onClose: () => void
}) {
  if (!person) return null

  return (
    <Drawer open onClose={onClose} title={person.username} subtitle={person.email}>
      <div className="px-4 py-4">
        <h3 className="t-col mb-1.5">Role</h3>
        <p className="t-row text-ink">{titleCase(person.role)}</p>
        <p className="t-body mt-1 text-ink-2">{ROLE_DESCRIPTIONS[person.role]}</p>
      </div>

      <div className="border-t border-line px-4 py-4">
        <h3 className="t-col mb-2">What this role permits</h3>
        <ul className="space-y-1.5">
          {ROLE_PERMISSIONS[person.role].map((permission) => (
            <li key={permission} className="t-body flex gap-2 text-ink-2">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
              {permission}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-line px-4 py-4">
        <h3 className="t-col mb-2">Accounts</h3>
        {accounts.length === 0 ? (
          <p className="t-body text-ink-3">No accounts are held in this name.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="t-ident block truncate text-ink">{account.accountNumber}</span>
                  <span className="t-micro">{titleCase(account.accountType)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge tone={statusTone(account.status)}>{statusLabel(account.status)}</Badge>
                  <Money
                    minorUnits={account.balanceMinorUnits}
                    currency={account.currency}
                    variant="balance"
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-4 py-4">
        <h3 className="t-col mb-1.5">Joined</h3>
        <p className="t-row text-ink">{formatDateTime(person.createdAt)}</p>
      </div>
    </Drawer>
  )
}

function AddPersonModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { notify } = useToast()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('CUSTOMER')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setUsername('')
    setEmail('')
    setPassword('')
    setRole('CUSTOMER')
    setErrors({})
    setFormError(null)
  }

  /**
   * Mirrors the server's Bean Validation rules so problems surface as the
   * person types rather than after a round trip. The server remains the
   * authority; this is a courtesy, not the enforcement point.
   */
  function validate(): boolean {
    const next: Record<string, string> = {}
    if (username.trim().length < 3) next.username = 'At least 3 characters.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (password.length < 8) next.password = 'At least 8 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    setFormError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      await usersApi.create({ username: username.trim(), email: email.trim(), password, role })
      notify(`${username.trim()} added as ${role.toLowerCase()}`, 'success')
      reset()
      onCreated()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Add a person"
      description="They can sign in immediately with the password you set."
      confirmLabel="Add person"
      onConfirm={() => submit()}
      confirmLoading={submitting}
    >
      <form onSubmit={submit} noValidate>
        {formError && (
          <div className="mb-4">
            <ErrorState message={formError} />
          </div>
        )}
        <Field label="Username" error={errors.username || undefined}>
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                setErrors((previous) => ({ ...previous, username: '' }))
              }}
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="Email" error={errors.email || undefined}>
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setErrors((previous) => ({ ...previous, email: '' }))
              }}
              autoComplete="off"
            />
          )}
        </Field>
        <Field
          label="Temporary password"
          error={errors.password || undefined}
          hint="Share it over a secure channel."
        >
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrors((previous) => ({ ...previous, password: '' }))
              }}
              autoComplete="new-password"
            />
          )}
        </Field>
        <Field label="Role" hint={ROLE_DESCRIPTIONS[role]}>
          {(id, describedBy) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </form>
    </Modal>
  )
}
