import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { accountsApi, ledgerApi } from '../api/endpoints'
import type { AccountStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { BalanceCard } from '../components/BalanceCard'
import { IconArrowLeft, IconDeposit, IconHistory, IconWithdraw } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { AmountInput, TextInput } from '../components/ui/Field'
import { Glyph, ListRow, ListSection } from '../components/ui/List'
import { ConfirmSheet, Sheet } from '../components/ui/Sheet'
import { Badge, EmptyState, ErrorState } from '../components/ui/Surface'
import { useToast } from '../components/ui/Toast'
import { formatAccountNumber, formatDateTime, formatMinorUnits, formatRelativeDate, parseMajorUnits } from '../lib/money'
import { useAsync } from '../lib/useAsync'
import { RowSkeletons } from '../components/TransactionRow'
import { titleCase } from '../lib/text'

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

  // When the account itself cannot be loaded there is nothing else worth
  // rendering, so this is one explanatory state rather than a repeated error
  // above a row of empty skeletons.
  if (account.error) {
    return (
      <div className="px-4 sm:px-0">
        <BackLink />
        <div className="list-group">
          <EmptyState
            title="This account could not be opened"
            description={account.error}
            action={
              <div className="flex gap-2">
                <Button onClick={account.reload}>Try again</Button>
                <Button variant="filled" asLink="/accounts">Back to accounts</Button>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="px-4 sm:px-0">
        <BackLink />
      </div>

      <div className="mb-7 px-4 sm:px-0">
        <BalanceCard account={data} loading={account.loading} />
      </div>

      {isTeller && data?.status === 'ACTIVE' && (
        <div className="mb-8 grid grid-cols-2 gap-3 px-4 sm:px-0">
          <Button variant="filled" size="lg" iconLeft={<IconDeposit className="h-[18px] w-[18px]" />} onClick={() => setCashMode('deposit')}>
            Deposit
          </Button>
          <Button variant="tinted" size="lg" iconLeft={<IconWithdraw className="h-[18px] w-[18px]" />} onClick={() => setCashMode('withdraw')}>
            Withdraw
          </Button>
        </div>
      )}

      <ListSection header="Details">
        {account.loading || !data ? (
          <RowSkeletons count={3} />
        ) : (
          <>
            <ListRow title="Account number" value={<span className="t-money">{formatAccountNumber(data.accountNumber)}</span>} />
            <ListRow title="Type" value={titleCase(data.accountType)} />
            <ListRow title="Status" value={<Badge>{data.status}</Badge>} />
            <ListRow title="Holder" value={data.ownerUsername ?? 'The institution'} />
            <ListRow title="Opened" value={formatDateTime(data.createdAt)} />
          </>
        )}
      </ListSection>

      {isAdmin && data && data.status !== 'CLOSED' && (
        <ListSection
          header="Manage"
          footer="Closing is permanent. A closed account can never reopen or transact again, and its balance must already be zero."
        >
          {data.status === 'ACTIVE' ? (
            <ListRow title="Freeze account" onClick={() => setPendingStatus('INACTIVE')} chevron />
          ) : (
            <ListRow title="Reactivate account" onClick={() => setPendingStatus('ACTIVE')} chevron />
          )}
          <ListRow title="Close account" destructive onClick={() => setPendingStatus('CLOSED')} chevron />
        </ListSection>
      )}

      <ListSection header="Ledger" footer="Every posting against this account. Entries are append-only and can never be edited.">
        {ledger.error ? (
          <div className="p-4">
            <ErrorState message={ledger.error} onRetry={ledger.reload} />
          </div>
        ) : ledger.loading ? (
          <RowSkeletons count={4} />
        ) : (ledger.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<IconHistory className="h-6 w-6" />}
            title="No postings yet"
            description={isTeller ? 'Record a deposit to give this account its opening balance.' : 'Transactions against this account will appear here.'}
            action={isTeller && <Button variant="filled" onClick={() => setCashMode('deposit')}>Record a deposit</Button>}
          />
        ) : (
          ledger.data!.map((entry) => {
            const isCredit = entry.entryType === 'CREDIT'
            return (
              <ListRow
                key={entry.id}
                to={`/transfers/${entry.transactionId}`}
                leading={
                  <Glyph tone={isCredit ? 'green' : 'gray'}>
                    {isCredit ? <IconDeposit className="h-[18px] w-[18px]" /> : <IconWithdraw className="h-[18px] w-[18px]" />}
                  </Glyph>
                }
                title={isCredit ? 'Money in' : 'Money out'}
                subtitle={formatRelativeDate(entry.createdAt)}
                value={
                  <span className={`t-money ${isCredit ? 'text-[var(--green)]' : 'text-[var(--label)]'}`}>
                    {isCredit ? '+' : '−'}
                    {formatMinorUnits(entry.amountMinorUnits, data?.currency ?? 'USD')}
                  </span>
                }
              />
            )
          })
        )}
      </ListSection>

      <CashSheet
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

      <ConfirmSheet
        open={pendingStatus !== null}
        title={pendingStatus === 'CLOSED' ? 'Close this account?' : pendingStatus === 'INACTIVE' ? 'Freeze this account?' : 'Reactivate this account?'}
        description={
          pendingStatus === 'CLOSED'
            ? 'This cannot be undone. A closed account can never reopen or transact again.'
            : pendingStatus === 'INACTIVE'
              ? 'While frozen, no money can move in or out. You can reactivate it at any time.'
              : 'Reactivating allows this account to send and receive money again.'
        }
        confirmLabel={pendingStatus === 'CLOSED' ? 'Close permanently' : 'Confirm'}
        destructive={pendingStatus === 'CLOSED'}
        loading={statusSubmitting}
        onConfirm={applyStatus}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/accounts" className="t-body mb-4 inline-flex items-center gap-0.5 text-[var(--blue)] active:opacity-55">
      <IconArrowLeft className="h-[18px] w-[18px]" />
      Accounts
    </Link>
  )
}

function CashSheet({
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

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    setError(null)

    const minorUnits = parseMajorUnits(amount)
    if (minorUnits === null) {
      setFieldError('Enter an amount greater than zero, with at most two decimal places.')
      return
    }
    // Checked here only for a faster answer; the server enforces this
    // authoritatively inside the row lock, which is the check that counts.
    if (!isDeposit && minorUnits > availableMinorUnits) {
      setFieldError(`Only ${formatMinorUnits(availableMinorUnits, currency)} is available.`)
      return
    }
    setFieldError(null)
    setSubmitting(true)

    try {
      const call = isDeposit ? accountsApi.deposit : accountsApi.withdraw
      const result = await call(accountId, { amountMinorUnits: minorUnits, reference: reference.trim() || (isDeposit ? 'Deposit' : 'Withdrawal') })
      notify(
        `${isDeposit ? 'Deposited' : 'Withdrew'} ${formatMinorUnits(minorUnits, currency)} · balance ${formatMinorUnits(result.resultingBalanceMinorUnits, currency)}`,
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
    <Sheet
      open={mode !== null}
      onClose={() => {
        reset()
        onClose()
      }}
      title={isDeposit ? 'Add money' : 'Take out money'}
      description={
        isDeposit
          ? 'Cash entering the ledger is debited from the branch vault, so the books stay balanced.'
          : 'Cash leaving the ledger is credited back to the branch vault.'
      }
      confirmLabel={isDeposit ? 'Deposit' : 'Withdraw'}
      onConfirm={() => submit()}
      confirmLoading={submitting}
    >
      <form onSubmit={submit} className="space-y-5 pb-2" noValidate>
        {error && <ErrorState message={error} />}
        <div className="py-3">
          <AmountInput
            value={amount}
            onChange={(next) => {
              setAmount(next)
              setFieldError(null)
            }}
            error={fieldError ?? undefined}
            hint={!isDeposit ? `${formatMinorUnits(availableMinorUnits, currency)} available` : undefined}
            autoFocus
          />
        </div>
        <TextInput
          label="Reference"
          placeholder={isDeposit ? 'Counter deposit' : 'ATM withdrawal'}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          maxLength={140}
        />
      </form>
    </Sheet>
  )
}
