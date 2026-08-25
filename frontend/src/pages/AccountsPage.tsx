import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { accountsApi, usersApi } from '../api/endpoints'
import type { AccountResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageLayout } from '../components/layout/PageLayout'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Field, Select } from '../components/ui/Field'
import { Money } from '../components/ui/Money'
import { Modal } from '../components/ui/Overlay'
import { AsyncSection, EmptyState, ErrorState, TableSkeleton } from '../components/ui/States'
import { ClearFilters, FilterSelect, SearchInput, Toolbar } from '../components/ui/Toolbar'
import { useToast } from '../components/ui/Toast'
import { formatShortDate } from '../lib/format'
import { formatDateTime } from '../lib/money'
import { titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'
import { statusLabel, statusTone } from './accountStatus'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Frozen' },
  { value: 'CLOSED', label: 'Closed' },
]

const TYPE_OPTIONS = [
  { value: 'CHECKING', label: 'Checking' },
  { value: 'SAVINGS', label: 'Savings' },
]

/**
 * The account register.
 *
 * <p>Filtering here is client-side, which is defensible only because
 * {@code GET /accounts} returns the caller's complete set rather than a page of
 * it — so the filter genuinely applies to everything, not to whatever happened
 * to load. The moment that endpoint becomes paged, this has to move to the
 * server, for the same reason the transaction filters already live there.
 */
export function AccountsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const accounts = useAsync(() => accountsApi.list(), [])

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [creating, setCreating] = useState(false)

  const canOpen = user?.role === 'ADMIN' || user?.role === 'TELLER'
  const isStaff = user?.role !== 'CUSTOMER'

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (accounts.data ?? []).filter((account) => {
      if (status && account.status !== status) return false
      if (type && account.accountType !== type) return false
      if (!term) return true
      return (
        account.accountNumber.includes(term) ||
        (account.ownerUsername ?? '').toLowerCase().includes(term)
      )
    })
  }, [accounts.data, search, status, type])

  const columns = useMemo<Column<AccountResponse>[]>(
    () => [
      {
        key: 'number',
        header: 'Account',
        width: '150px',
        render: (row) => <span className="t-ident text-ink">{row.accountNumber}</span>,
      },
      {
        key: 'holder',
        header: 'Holder',
        render: (row) => (
          <span className="t-row block truncate text-ink">{row.ownerUsername ?? 'The institution'}</span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        width: '100px',
        minWidth: 'lg',
        render: (row) => <span className="t-row text-ink-2">{titleCase(row.accountType)}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        width: '92px',
        render: (row) => <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>,
      },
      {
        key: 'opened',
        header: 'Opened',
        width: '110px',
        minWidth: 'xl',
        render: (row) => (
          <span className="t-row text-ink-2" title={formatDateTime(row.createdAt)}>
            {formatShortDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        width: '140px',
        render: (row) => (
          <Money minorUnits={row.balanceMinorUnits} currency={row.currency} variant="balance" />
        ),
      },
    ],
    [],
  )

  const filtered = Boolean(search || status || type)

  return (
    <>
      <PageLayout
        title="Accounts"
        actions={canOpen && <Button onClick={() => setCreating(true)}>Open account</Button>}
        toolbar={
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search number or holder" />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <FilterSelect label="Type" value={type} onChange={setType} options={TYPE_OPTIONS} />
            <ClearFilters
              show={filtered}
              onClear={() => {
                setSearch('')
                setStatus('')
                setType('')
              }}
            />
          </Toolbar>
        }
      >
        <AsyncSection
          data={accounts.data}
          loading={accounts.loading}
          error={accounts.error}
          onRetry={accounts.reload}
          skeleton={<TableSkeleton rows={6} columns={5} />}
        >
          {() => (
            <>
              <DataTable
                caption="Accounts"
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                onOpenRow={(row) => navigate(`/accounts/${row.id}`)}
                mobileRow={(row) => (
                  <>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="t-ident truncate text-ink">{row.accountNumber}</span>
                      <Money
                        minorUnits={row.balanceMinorUnits}
                        currency={row.currency}
                        variant="balance"
                        className="shrink-0"
                      />
                    </span>
                    <span className="t-micro mt-0.5 flex items-baseline justify-between gap-3">
                      <span className="truncate">
                        {row.ownerUsername ?? 'The institution'} · {titleCase(row.accountType)}
                      </span>
                      <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                    </span>
                  </>
                )}
                emptyState={
                  <EmptyState
                    title={filtered ? 'No accounts match those filters' : 'No accounts yet'}
                    description={
                      filtered
                        ? 'Clear the filters to see the full register.'
                        : canOpen
                          ? 'Open the first account to start recording deposits and transfers against it.'
                          : 'Once a teller opens an account in your name it will appear here.'
                    }
                    action={
                      !filtered && canOpen ? (
                        <Button variant="primary" onClick={() => setCreating(true)}>
                          Open account
                        </Button>
                      ) : undefined
                    }
                  />
                }
                footer={
                  <p className="t-micro">
                    {rows.length.toLocaleString()} {rows.length === 1 ? 'account' : 'accounts'}
                  </p>
                }
              />
              {isStaff && rows.length > 0 && (
                <p className="t-body mt-3 max-w-[70ch] text-ink-3">
                  The institution’s own cash vault is not listed here. It exists as the counterparty
                  that keeps deposits and withdrawals balanced, which is why every balance above
                  sums to exactly zero against it.
                </p>
              )}
            </>
          )}
        </AsyncSection>
      </PageLayout>

      <OpenAccountModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false)
          accounts.reload()
        }}
      />
    </>
  )
}

function OpenAccountModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { notify } = useToast()
  // Fetched only while open; no reason to pull the full user list on every
  // visit to the accounts screen.
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
      const account = await accountsApi.create({
        ownerUserId: Number(ownerUserId),
        accountType,
        currency,
      })
      notify(`Account ····${account.accountNumber.slice(-4)} opened`, 'success')
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
      description="The account number is generated automatically."
      confirmLabel="Open account"
      onConfirm={() => submit()}
      confirmLoading={submitting}
    >
      <form onSubmit={submit} noValidate>
        {error && (
          <div className="mb-4">
            <ErrorState message={error} />
          </div>
        )}
        {/* A picker, not a raw id field: nobody knows a customer's numeric
            primary key, and asking for one guarantees mistyped accounts. */}
        <Field label="Account holder">
          {(id) => (
            <Select
              id={id}
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
            </Select>
          )}
        </Field>

        <Field label="Type">
          {(id) => (
            <Select id={id} value={accountType} onChange={(e) => setAccountType(e.target.value)}>
              <option value="CHECKING">Checking</option>
              <option value="SAVINGS">Savings</option>
            </Select>
          )}
        </Field>

        <Field label="Currency">
          {(id) => (
            <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — Pound Sterling</option>
              <option value="INR">INR — Indian Rupee</option>
            </Select>
          )}
        </Field>
      </form>
    </Modal>
  )
}
