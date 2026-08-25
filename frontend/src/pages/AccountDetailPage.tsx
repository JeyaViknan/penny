import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { accountsApi, ledgerApi } from '../api/endpoints'
import type { AccountStatus, LedgerEntryResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { IconArrowLeft, IconDeposit, IconHistory, IconWithdraw } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { TextInput } from '../components/ui/Field'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/Surface'
import { useToast } from '../components/ui/Toast'
import { formatAccountNumber, formatDateTime, formatMinorUnits, parseMajorUnits } from '../lib/money'
import { useAsync } from '../lib/useAsync'

type CashMode = 'deposit' | 'withdraw' | null

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const accountId = Number(id)
  const { user } = useAuth()
  const { notify } = useToast()

  const account = useAsync(() => accountsApi.get(accountId), [accountId])
  const ledger = useAsync(() => ledgerApi.forAccount(accountId), [accountId])

  const [cashMode, setCashMode] = useState<CashMode>(null)
  const [pendingStatus, setPendingStatus] = useState<AccountStatus | null>(null)
  const [statusSubmitting, setStatusSubmitting] = useState(false)

  const isTeller = user?.role === 'TELLER' || user?.role === 'ADMIN'
  const isAdmin = user?.role === 'ADMIN'
  const data = account.data

  function refresh() {
    account.reload()
    ledger.reload()
  }

  async function applyStatus() {
    if (!pendingStatus) return
    setStatusSubmitting(true)
    try {
      await accountsApi.changeStatus(accountId, pendingStatus)
      notify(`Account is now ${pendingStatus.toLowerCase()}`, 'success')
      setPendingStatus(null)
      refresh()
    } catch (err) {
      notify(extractErrorMessage(err), 'error')
      setPendingStatus(null)
    } finally {
      setStatusSubmitting(false)
    }
  }

  return (
    <div>
      <Link
        to="/accounts"
        className="t-caption mb-4 inline-flex items-center gap-1.5 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <IconArrowLeft className="h-3.5 w-3.5" />
        Accounts
      </Link>

      {/* When the account itself cannot be loaded there is nothing else on the
          page worth rendering, so it returns a single explanatory state rather
          than repeating the same error above a row of empty skeletons. */}
      {account.error ? (
        <EmptyState
          // Neutral wording: this covers both "does not exist" and "not yours",
          // and the server deliberately does not distinguish the two so that a
          // 404 cannot be used to probe which account ids are real.
          title="This account could not be opened"
          description={account.error}
          action={
            <div className="flex gap-2">
              <Button onClick={account.reload}>Try again</Button>
              <Button variant="primary" asLink="/accounts">
                Back to accounts
              </Button>
            </div>
          }
        />
      ) : (
        <>
      {account.loading ? (
        <div className="mb-7 space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : data ? (
        <PageHeader
          title={formatAccountNumber(data.accountNumber)}
          description={`${data.accountType} · ${data.currency} · held by ${data.ownerUsername ?? 'the institution'}`}
          action={
            isTeller &&
            data.status === 'ACTIVE' && (
              <div className="flex gap-2">
                <Button iconLeft={<IconDeposit className="h-4 w-4" />} onClick={() => setCashMode('deposit')}>
                  Deposit
                </Button>
                <Button iconLeft={<IconWithdraw className="h-4 w-4" />} onClick={() => setCashMode('withdraw')}>
                  Withdraw
                </Button>
              </div>
            )
          }
        />
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="t-label text-[var(--text-tertiary)]">Available balance</p>
          {data ? (
            <p className="t-figure mt-2 text-[1.625rem] font-semibold text-[var(--text-primary)]">
              {formatMinorUnits(data.balanceMinorUnits, data.currency)}
            </p>
          ) : (
            <Skeleton className="mt-2.5 h-7 w-32" />
          )}
        </Card>
        <Card>
          <p className="t-label text-[var(--text-tertiary)]">Status</p>
          <div className="mt-2.5">{data ? <Badge>{data.status}</Badge> : <Skeleton className="h-5 w-16" />}</div>
          {isAdmin && data && data.status !== 'CLOSED' && (
            <div className="mt-3">
              <StatusControl current={data.status} onSelect={setPendingStatus} />
            </div>
          )}
        </Card>
        <Card>
          <p className="t-label text-[var(--text-tertiary)]">Opened</p>
          {data ? (
            <p className="t-body mt-2.5 text-[var(--text-primary)]">{formatDateTime(data.createdAt)}</p>
          ) : (
            <Skeleton className="mt-2.5 h-5 w-36" />
          )}
        </Card>
      </div>

      <Card padded={false}>
        <CardHeader
          title="Ledger"
          description="Every posting against this account, newest first. Entries are append-only."
        />
        {ledger.error ? (
          <div className="p-5">
            <ErrorState message={ledger.error} onRetry={ledger.reload} />
          </div>
        ) : (
          <DataTable
            caption="Ledger entries"
            columns={LEDGER_COLUMNS}
            rows={ledger.data ?? []}
            rowKey={(e) => e.id}
            loading={ledger.loading}
            empty={
              <EmptyState
                icon={<IconHistory className="h-5 w-5" />}
                title="No postings yet"
                description={
                  isTeller
                    ? 'Record a deposit to give this account its opening balance.'
                    : 'Transactions against this account will appear here.'
                }
                action={
                  isTeller && (
                    <Button iconLeft={<IconDeposit className="h-4 w-4" />} onClick={() => setCashMode('deposit')}>
                      Record a deposit
                    </Button>
                  )
                }
              />
            }
          />
        )}
      </Card>

      <CashDialog
        mode={cashMode}
        accountId={accountId}
        currency={data?.currency ?? 'USD'}
        availableMinorUnits={data?.balanceMinorUnits ?? 0}
        onClose={() => setCashMode(null)}
        onDone={() => {
          setCashMode(null)
          refresh()
        }}
      />

      <ConfirmDialog
        open={pendingStatus !== null}
        title={pendingStatus === 'CLOSED' ? 'Close this account?' : `Set account to ${pendingStatus?.toLowerCase()}?`}
        description={
          pendingStatus === 'CLOSED'
            ? 'Closing is permanent — a closed account can never be reopened or transact again. The balance must already be zero.'
            : pendingStatus === 'INACTIVE'
              ? 'While frozen, no money can move in or out of this account. You can reactivate it at any time.'
              : 'Reactivating allows this account to send and receive money again.'
        }
        confirmLabel={pendingStatus === 'CLOSED' ? 'Close permanently' : 'Confirm'}
        destructive={pendingStatus === 'CLOSED'}
        loading={statusSubmitting}
        onConfirm={applyStatus}
        onCancel={() => setPendingStatus(null)}
      />
        </>
      )}
    </div>
  )
}

const LEDGER_COLUMNS: Column<LedgerEntryResponse>[] = [
  {
    key: 'date',
    header: 'Posted',
    primary: true,
    render: (e) => <span className="t-caption whitespace-nowrap text-[var(--text-secondary)]">{formatDateTime(e.createdAt)}</span>,
  },
  {
    key: 'transaction',
    header: 'Transaction',
    render: (e) => (
      <Link
        to={`/transfers/${e.transactionId}`}
        className="t-figure text-[0.8125rem] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-fg)]"
      >
        #{e.transactionId}
      </Link>
    ),
  },
  { key: 'type', header: 'Type', secondary: true, render: (e) => <Badge>{e.entryType}</Badge> },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (e) => (
      <span
        className={`t-figure whitespace-nowrap text-[0.875rem] ${
          e.entryType === 'CREDIT' ? 'text-[var(--positive)]' : 'text-[var(--text-primary)]'
        }`}
      >
        {e.entryType === 'DEBIT' ? '−' : '+'}
        {formatMinorUnits(e.amountMinorUnits)}
      </span>
    ),
  },
]

function StatusControl({
  current,
  onSelect,
}: {
  current: AccountStatus
  onSelect: (status: AccountStatus) => void
}) {
  return (
    <div className="flex gap-2">
      {current === 'ACTIVE' ? (
        <Button size="sm" onClick={() => onSelect('INACTIVE')}>
          Freeze
        </Button>
      ) : (
        <Button size="sm" onClick={() => onSelect('ACTIVE')}>
          Reactivate
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => onSelect('CLOSED')}>
        Close
      </Button>
    </div>
  )
}

function CashDialog({
  mode,
  accountId,
  currency,
  availableMinorUnits,
  onClose,
  onDone,
}: {
  mode: CashMode
  accountId: number
  currency: string
  availableMinorUnits: number
  onClose: () => void
  onDone: () => void
}) {
  const { notify } = useToast()
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isDeposit = mode === 'deposit'

  function reset() {
    setAmount('')
    setReference('')
    setError(null)
    setFieldError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const minorUnits = parseMajorUnits(amount)
    if (minorUnits === null) {
      setFieldError('Enter an amount greater than zero, with at most two decimal places.')
      return
    }
    // Checked client-side purely for a faster answer; the server enforces this
    // authoritatively inside the row lock, which is the check that counts.
    if (!isDeposit && minorUnits > availableMinorUnits) {
      setFieldError(`Only ${formatMinorUnits(availableMinorUnits, currency)} is available to withdraw.`)
      return
    }
    setFieldError(null)
    setSubmitting(true)

    try {
      const call = isDeposit ? accountsApi.deposit : accountsApi.withdraw
      const result = await call(accountId, { amountMinorUnits: minorUnits, reference: reference.trim() })
      notify(
        `${isDeposit ? 'Deposited' : 'Withdrew'} ${formatMinorUnits(minorUnits, currency)} · balance now ${formatMinorUnits(
          result.resultingBalanceMinorUnits,
          currency,
        )}`,
        'success',
      )
      reset()
      onDone()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={mode !== null}
      onClose={() => {
        reset()
        onClose()
      }}
      title={isDeposit ? 'Record a deposit' : 'Record a withdrawal'}
      description={
        isDeposit
          ? 'Money entering the ledger is debited from the branch cash vault, so the books stay balanced.'
          : 'Money leaving the ledger is credited back to the branch cash vault.'
      }
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
            {isDeposit ? 'Deposit' : 'Withdraw'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <ErrorState message={error} />}
        <TextInput
          label="Amount"
          prefix="$"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setFieldError(null)
          }}
          error={fieldError ?? undefined}
          hint={!isDeposit ? `${formatMinorUnits(availableMinorUnits, currency)} available` : undefined}
          autoFocus
        />
        <TextInput
          label="Reference"
          placeholder={isDeposit ? 'e.g. Counter deposit' : 'e.g. ATM withdrawal'}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          maxLength={140}
          required
        />
      </form>
    </Modal>
  )
}
