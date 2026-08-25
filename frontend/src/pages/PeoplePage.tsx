import { useState, type FormEvent } from 'react'
import { extractErrorMessage } from '../api/client'
import { usersApi } from '../api/endpoints'
import type { Role, UserResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { IconPlus, IconUsers } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { SelectInput, TextInput } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Badge, Card, EmptyState, ErrorState, PageHeader } from '../components/ui/Surface'
import { useToast } from '../components/ui/Toast'
import { formatDate } from '../lib/money'
import { useAsync } from '../lib/useAsync'

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  CUSTOMER: 'Sees only their own accounts and transfers.',
  TELLER: 'Opens accounts and moves money on behalf of customers.',
  AUDITOR: 'Read-only access to everything, including the audit trail.',
  ADMIN: 'Full access, including account status and user management.',
}

export function PeoplePage() {
  const { user } = useAuth()
  const users = useAsync(() => usersApi.list(), [])
  const [dialogOpen, setDialogOpen] = useState(false)

  const canCreate = user?.role === 'ADMIN'

  return (
    <div>
      <PageHeader
        title="People"
        description="Everyone with access to LedgerLite, and what each role is permitted to do."
        action={
          canCreate && (
            <Button variant="primary" iconLeft={<IconPlus className="h-4 w-4" />} onClick={() => setDialogOpen(true)}>
              Add person
            </Button>
          )
        }
      />

      {users.error && (
        <div className="mb-4">
          <ErrorState message={users.error} onRetry={users.reload} />
        </div>
      )}

      <Card padded={false}>
        <DataTable
          caption="People with access"
          columns={COLUMNS}
          rows={users.data ?? []}
          rowKey={(u) => u.id}
          loading={users.loading}
          empty={
            <EmptyState
              icon={<IconUsers className="h-5 w-5" />}
              title="No one to show"
              description="People with access to the ledger will be listed here."
            />
          }
        />
      </Card>

      <AddPersonDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false)
          users.reload()
        }}
      />
    </div>
  )
}

const COLUMNS: Column<UserResponse>[] = [
  {
    key: 'username',
    header: 'Username',
    primary: true,
    render: (u) => <span className="text-[var(--text-primary)]">{u.username}</span>,
  },
  { key: 'email', header: 'Email', render: (u) => <span className="t-caption text-[var(--text-secondary)]">{u.email}</span> },
  { key: 'role', header: 'Role', secondary: true, render: (u) => <Badge>{u.role}</Badge> },
  {
    key: 'status',
    header: 'Status',
    hideOnMobile: true,
    render: (u) => <Badge tone={u.enabled ? 'positive' : 'warning'}>{u.enabled ? 'ENABLED' : 'DISABLED'}</Badge>,
  },
  {
    key: 'created',
    header: 'Joined',
    align: 'right',
    render: (u) => <span className="t-caption text-[var(--text-tertiary)]">{formatDate(u.createdAt)}</span>,
  },
]

function AddPersonDialog({
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
   * authority -- this is a courtesy, not the enforcement point.
   */
  function validate(): boolean {
    const next: Record<string, string> = {}
    if (username.trim().length < 3) next.username = 'Must be at least 3 characters.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = 'Enter a valid email address.'
    if (password.length < 8) next.password = 'Must be at least 8 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
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
      description="They will be able to sign in immediately with the password you set."
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset()
              onClose()
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Add person
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          autoFocus
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
          hint="At least 8 characters. Share it with them over a secure channel."
          autoComplete="new-password"
        />
        <SelectInput label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} hint={ROLE_DESCRIPTIONS[role]}>
          <option value="CUSTOMER">Customer</option>
          <option value="TELLER">Teller</option>
          <option value="AUDITOR">Auditor</option>
          <option value="ADMIN">Administrator</option>
        </SelectInput>
      </form>
    </Modal>
  )
}
