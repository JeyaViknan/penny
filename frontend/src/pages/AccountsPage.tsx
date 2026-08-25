import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { accountsApi, usersApi } from '../api/endpoints'
import type { AccountResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { IconAccounts, IconPlus } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { SelectInput } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Badge, Card, EmptyState, ErrorState, PageHeader } from '../components/ui/Surface'
import { useToast } from '../components/ui/Toast'
import { formatAccountNumber, formatMinorUnits } from '../lib/money'
import { useAsync } from '../lib/useAsync'

export function AccountsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const accounts = useAsync(() => accountsApi.list(), [])
  const [openDialog, setOpenDialog] = useState(false)

  const canOpenAccounts = user?.role === 'ADMIN' || user?.role === 'TELLER'
  const isStaff = user?.role !== 'CUSTOMER'

  return (
    <div>
      <PageHeader
        title="Accounts"
        description={isStaff ? 'Every customer account on the books.' : 'Accounts held in your name.'}
        action={
          canOpenAccounts && (
            <Button variant="primary" iconLeft={<IconPlus className="h-4 w-4" />} onClick={() => setOpenDialog(true)}>
              Open account
            </Button>
          )
        }
      />

      {accounts.error && (
        <div className="mb-4">
          <ErrorState message={accounts.error} onRetry={accounts.reload} />
        </div>
      )}

      <Card padded={false}>
        <DataTable
          caption="Accounts"
          columns={columns(isStaff)}
          rows={accounts.data ?? []}
          rowKey={(a) => a.id}
          loading={accounts.loading}
          onRowClick={(a) => navigate(`/accounts/${a.id}`)}
          empty={
            <EmptyState
              icon={<IconAccounts className="h-5 w-5" />}
              title={canOpenAccounts ? 'No accounts opened yet' : 'No accounts yet'}
              description={
                canOpenAccounts
                  ? 'Open the first account to start recording deposits and transfers against it.'
                  : 'Once a teller opens an account in your name it will appear here.'
              }
              action={
                canOpenAccounts && (
                  <Button variant="secondary" iconLeft={<IconPlus className="h-4 w-4" />} onClick={() => setOpenDialog(true)}>
                    Open account
                  </Button>
                )
              }
            />
          }
        />
      </Card>

      <OpenAccountDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onCreated={() => {
          setOpenDialog(false)
          accounts.reload()
        }}
      />
    </div>
  )
}

function columns(isStaff: boolean): Column<AccountResponse>[] {
  const base: Column<AccountResponse>[] = [
    {
      key: 'number',
      header: 'Account number',
      primary: true,
      render: (a) => <span className="t-figure text-[0.875rem] text-[var(--text-primary)]">{formatAccountNumber(a.accountNumber)}</span>,
    },
  ]

  if (isStaff) {
    base.push({
      key: 'owner',
      header: 'Holder',
      render: (a) => <span className="text-[var(--text-secondary)]">{a.ownerUsername ?? '—'}</span>,
    })
  }

  base.push(
    { key: 'type', header: 'Type', render: (a) => <span className="t-caption text-[var(--text-secondary)]">{a.accountType}</span> },
    { key: 'status', header: 'Status', secondary: true, render: (a) => <Badge>{a.status}</Badge> },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (a) => (
        <span className="t-figure whitespace-nowrap text-[0.875rem] text-[var(--text-primary)]">
          {formatMinorUnits(a.balanceMinorUnits, a.currency)}
        </span>
      ),
    },
  )

  return base
}

function OpenAccountDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { notify } = useToast()
  // Only fetched while the dialog is open -- there is no reason to pull the
  // full user list on every visit to the accounts page.
  const users = useAsync(() => (open ? usersApi.list() : Promise.resolve([])), [open])
  const [ownerUserId, setOwnerUserId] = useState('')
  const [accountType, setAccountType] = useState('CHECKING')
  const [currency, setCurrency] = useState('USD')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const customers = (users.data ?? []).filter((u) => u.role === 'CUSTOMER')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ownerUserId) {
      setError('Choose which customer this account belongs to.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const account = await accountsApi.create({ ownerUserId: Number(ownerUserId), accountType, currency })
      notify(`Account ${formatAccountNumber(account.accountNumber)} opened`, 'success')
      setOwnerUserId('')
      onCreated()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Open an account"
      description="The account number is generated automatically and cannot be chosen."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Open account
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorState message={error} />}

        {/* A picker, not a raw id field -- nobody knows a customer's numeric
            primary key, and asking for one guarantees mistyped accounts. */}
        <SelectInput
          label="Account holder"
          value={ownerUserId}
          onChange={(e) => setOwnerUserId(e.target.value)}
          disabled={users.loading}
          required
        >
          <option value="">{users.loading ? 'Loading customers…' : 'Select a customer'}</option>
          {customers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username} · {u.email}
            </option>
          ))}
        </SelectInput>

        <SelectInput label="Account type" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
          <option value="CHECKING">Checking</option>
          <option value="SAVINGS">Savings</option>
        </SelectInput>

        <SelectInput label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="USD">USD — US Dollar</option>
          <option value="EUR">EUR — Euro</option>
          <option value="GBP">GBP — Pound Sterling</option>
          <option value="INR">INR — Indian Rupee</option>
        </SelectInput>
      </form>
    </Modal>
  )
}
