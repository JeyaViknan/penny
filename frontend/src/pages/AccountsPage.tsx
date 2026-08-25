import { useState, type FormEvent } from 'react'
import { extractErrorMessage } from '../api/client'
import { accountsApi, usersApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { IconAccounts, IconPlus } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { SelectInput } from '../components/ui/Field'
import { Glyph, ListRow, ListSection } from '../components/ui/List'
import { Sheet } from '../components/ui/Sheet'
import { Badge, EmptyState, ErrorState, PageHeader } from '../components/ui/Surface'
import { useToast } from '../components/ui/Toast'
import { formatAccountNumber, formatMinorUnits } from '../lib/money'
import { useAsync } from '../lib/useAsync'
import { RowSkeletons } from '../components/TransactionRow'
import { titleCase } from '../lib/text'

export function AccountsPage() {
  const { user } = useAuth()
  const accounts = useAsync(() => accountsApi.list(), [])
  const [sheetOpen, setSheetOpen] = useState(false)

  const canOpen = user?.role === 'ADMIN' || user?.role === 'TELLER'
  const isStaff = user?.role !== 'CUSTOMER'
  const list = accounts.data ?? []

  return (
    <div>
      <PageHeader
        title="Accounts"
        action={
          canOpen && (
            <Button variant="tinted" iconLeft={<IconPlus className="h-[18px] w-[18px]" />} onClick={() => setSheetOpen(true)}>
              Open
            </Button>
          )
        }
      />

      {accounts.error && (
        <div className="mb-6 px-4 sm:px-0">
          <ErrorState message={accounts.error} onRetry={accounts.reload} />
        </div>
      )}

      <ListSection
        footer={
          isStaff && list.length > 0
            ? 'The institution’s own cash vault is not listed here — it exists only as the counterparty that keeps deposits and withdrawals balanced.'
            : undefined
        }
      >
        {accounts.loading ? (
          <RowSkeletons count={3} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<IconAccounts className="h-6 w-6" />}
            title={canOpen ? 'No accounts opened yet' : 'No accounts yet'}
            description={
              canOpen
                ? 'Open the first account to start recording deposits and transfers against it.'
                : 'Once a teller opens an account in your name it will appear here.'
            }
            action={canOpen && <Button variant="filled" onClick={() => setSheetOpen(true)}>Open account</Button>}
          />
        ) : (
          list.map((account) => (
            <ListRow
              key={account.id}
              to={`/accounts/${account.id}`}
              leading={
                <Glyph tone={account.accountType === 'SAVINGS' ? 'indigo' : 'blue'}>
                  <IconAccounts className="h-[18px] w-[18px]" />
                </Glyph>
              }
              title={
                <span className="flex items-center gap-2">
                  {titleCase(account.accountType)}
                  {account.status !== 'ACTIVE' && <Badge>{account.status}</Badge>}
                </span>
              }
              subtitle={
                isStaff
                  ? `${formatAccountNumber(account.accountNumber)} · ${account.ownerUsername ?? '—'}`
                  : formatAccountNumber(account.accountNumber)
              }
              value={<span className="t-money">{formatMinorUnits(account.balanceMinorUnits, account.currency)}</span>}
            />
          ))
        )}
      </ListSection>

      <OpenAccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={() => {
          setSheetOpen(false)
          accounts.reload()
        }}
      />
    </div>
  )
}

function OpenAccountSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { notify } = useToast()
  // Only fetched while the sheet is open; no reason to pull the full user list
  // on every visit to the accounts screen.
  const users = useAsync(() => (open ? usersApi.list() : Promise.resolve([])), [open])
  const [ownerUserId, setOwnerUserId] = useState('')
  const [accountType, setAccountType] = useState('CHECKING')
  const [currency, setCurrency] = useState('USD')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const customers = (users.data ?? []).filter((u) => u.role === 'CUSTOMER')

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!ownerUserId) {
      setError('Choose which customer this account belongs to.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const account = await accountsApi.create({ ownerUserId: Number(ownerUserId), accountType, currency })
      notify(`Account ···· ${account.accountNumber.slice(-4)} opened`, 'success')
      setOwnerUserId('')
      onCreated()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Open an account"
      description="The account number is generated automatically."
      confirmLabel="Open account"
      onConfirm={() => submit()}
      confirmLoading={submitting}
    >
      <form onSubmit={submit} className="space-y-4 pb-2">
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
          <option value="">{users.loading ? 'Loading…' : 'Choose a customer'}</option>
          {customers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username} · {u.email}
            </option>
          ))}
        </SelectInput>

        <SelectInput label="Type" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
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
    </Sheet>
  )
}
