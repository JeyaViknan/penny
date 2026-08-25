import { useState, type FormEvent } from 'react'
import { extractErrorMessage } from '../api/client'
import { usersApi } from '../api/endpoints'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { IconPlus, IconUsers } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { SelectInput, TextInput } from '../components/ui/Field'
import { Glyph, ListRow, ListSection } from '../components/ui/List'
import { Sheet } from '../components/ui/Sheet'
import { Badge, EmptyState, ErrorState, PageHeader } from '../components/ui/Surface'
import { useToast } from '../components/ui/Toast'
import { useAsync } from '../lib/useAsync'
import { RowSkeletons } from '../components/TransactionRow'

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  CUSTOMER: 'Sees only their own accounts and transfers.',
  TELLER: 'Opens accounts and moves money on behalf of customers.',
  AUDITOR: 'Read-only access to everything, including the audit trail.',
  ADMIN: 'Full access, including account status and user management.',
}

const ROLE_TONE: Record<Role, 'blue' | 'green' | 'orange' | 'gray'> = {
  ADMIN: 'blue',
  TELLER: 'green',
  AUDITOR: 'orange',
  CUSTOMER: 'gray',
}

export function PeoplePage() {
  const { user } = useAuth()
  const users = useAsync(() => usersApi.list(), [])
  const [sheetOpen, setSheetOpen] = useState(false)

  const canCreate = user?.role === 'ADMIN'
  const list = users.data ?? []

  return (
    <div>
      <PageHeader
        title="People"
        action={
          canCreate && (
            <Button variant="tinted" iconLeft={<IconPlus className="h-[18px] w-[18px]" />} onClick={() => setSheetOpen(true)}>
              Add
            </Button>
          )
        }
      />

      {users.error && (
        <div className="mb-6 px-4 sm:px-0">
          <ErrorState message={users.error} onRetry={users.reload} />
        </div>
      )}

      <ListSection footer="Roles decide what each person can see and do. They are enforced on the server, not just hidden in the interface.">
        {users.loading ? (
          <RowSkeletons count={4} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<IconUsers className="h-6 w-6" />}
            title="No one to show"
            description="People with access to the ledger will be listed here."
          />
        ) : (
          list.map((person) => (
            <ListRow
              key={person.id}
              leading={
                <Glyph tone={ROLE_TONE[person.role]}>
                  <span className="text-[13px] font-semibold uppercase">{person.username.slice(0, 1)}</span>
                </Glyph>
              }
              title={person.username}
              subtitle={person.email}
              value={<Badge>{person.role}</Badge>}
              valueSubtitle={person.enabled ? undefined : 'Disabled'}
            />
          ))
        )}
      </ListSection>

      <AddPersonSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={() => {
          setSheetOpen(false)
          users.reload()
        }}
      />
    </div>
  )
}

function AddPersonSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
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
   * Mirrors the server's Bean Validation rules so problems surface as the person
   * types rather than after a round trip. The server remains the authority --
   * this is a courtesy, not the enforcement point.
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
    <Sheet
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
      <form onSubmit={submit} className="space-y-4 pb-2" noValidate>
        {formError && <ErrorState message={formError} />}
        <TextInput
          label="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setErrors((p) => ({ ...p, username: '' }))
          }}
          error={errors.username || undefined}
          autoComplete="off"
        />
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setErrors((p) => ({ ...p, email: '' }))
          }}
          error={errors.email || undefined}
          autoComplete="off"
        />
        <TextInput
          label="Temporary password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setErrors((p) => ({ ...p, password: '' }))
          }}
          error={errors.password || undefined}
          hint="Share it over a secure channel."
          autoComplete="new-password"
        />
        <SelectInput label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} hint={ROLE_DESCRIPTIONS[role]}>
          <option value="CUSTOMER">Customer</option>
          <option value="TELLER">Teller</option>
          <option value="AUDITOR">Auditor</option>
          <option value="ADMIN">Administrator</option>
        </SelectInput>
      </form>
    </Sheet>
  )
}
