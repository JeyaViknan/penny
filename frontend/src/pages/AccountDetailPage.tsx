import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { accountsApi, ledgerApi } from '../api/endpoints'
import type { AccountStatus, LedgerEntryResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageLayout, Section } from '../components/layout/PageLayout'
import { IconChevronRight } from '../components/Icons'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { AmountInput, Field, TextInput } from '../components/ui/Field'
import { Money } from '../components/ui/Money'
import { Modal } from '../components/ui/Overlay'
import { StatStrip } from '../components/ui/StatStrip'
import { AsyncSection, EmptyState, ErrorState, TableSkeleton } from '../components/ui/States'
import { Pagination } from '../components/ui/Toolbar'
import { useToast } from '../components/ui/Toast'
import { formatShortDate, formatTime } from '../lib/format'
import { formatDateTime, formatMinorUnits, parseMajorUnits } from '../lib/money'
import { titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'
import { statusLabel, statusTone } from './accountStatus'

type CashMode = 'deposit' | 'withdraw' | null

const PAGE_SIZE = 50

/**
 * One account, and its statement.
 *
 * <p>The running balance column is what makes this a statement rather than a
 * list of postings. Without it a reader has to add the entries up themselves to
 * answer the only question a statement is ever opened to answer: what was the
 * balance at this point in time. It is computed server-side across the account's
 * whole history, so it stays correct on page two — see the note on
 * LedgerEntrySearchRepository for why that is not automatic.
 */
export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const accountId = Number(id)
  const { user } = useAuth()
  const { notify } = useToast()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 0)

  const account = useAsync(() => accountsApi.get(accountId), [accountId])
  const ledger = useAsync(
    () => ledgerApi.forAccount(accountId, { page, size: PAGE_SIZE }),
    [accountId, page],
  )

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
      notify(`Account is now ${statusLabel(pendingStatus).toLowerCase()}`, 'success')
      setPendingStatus(null)
      refresh()
    } catch (err) {
      notify(extractErrorMessage(err), 'error')
      setPendingStatus(null)
    } finally {
      setStatusSubmitting(false)
    }
  }

  const columns = useMemo<Column<LedgerEntryResponse>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        width: '92px',
        render: (row) => (
          <span className="t-row whitespace-nowrap text-ink-2" title={formatDateTime(row.createdAt)}>
            {formatShortDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'time',
        header: 'Time',
        width: '70px',
        minWidth: 'xl',
        render: (row) => <span className="t-micro">{formatTime(row.createdAt)}</span>,
      },
      {
        key: 'transaction',
        header: 'Transaction',
        render: (row) => (
          <Link
            to={`/transfers/${row.transactionId}`}
            onClick={(event) => event.stopPropagation()}
            className="t-row text-accent hover:underline"
          >
            #{row.transactionId}
          </Link>
        ),
      },
      // Debit and credit as separate columns is the classic statement shape.
      // One signed column would be shorter and would lose the thing a ledger is
      // for: seeing which side of the account each entry landed on.
      {
        key: 'debit',
        header: 'Debit',
        align: 'right',
        width: '120px',
        render: (row) =>
          row.entryType === 'DEBIT' ? (
            <Money minorUnits={row.amountMinorUnits} />
          ) : (
            <span className="text-ink-faint">—</span>
          ),
      },
      {
        key: 'credit',
        header: 'Credit',
        align: 'right',
        width: '120px',
        render: (row) =>
          row.entryType === 'CREDIT' ? (
            <Money minorUnits={row.amountMinorUnits} className="text-positive" />
          ) : (
            <span className="text-ink-faint">—</span>
          ),
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        width: '140px',
        render: (row) =>
          row.runningBalanceMinorUnits === null ? (
            <span className="text-ink-faint">—</span>
          ) : (
            <Money
              minorUnits={row.runningBalanceMinorUnits}
              currency={data?.currency}
              variant="balance"
              className="font-medium"
            />
          ),
      },
    ],
    [data?.currency],
  )

  if (account.error) {
    return (
      <PageLayout title="Account" width="measure">
        <ErrorState message={account.error} onRetry={account.reload} />
        <div className="mt-4">
          <ButtonLink to="/accounts">Back to accounts</ButtonLink>
        </div>
      </PageLayout>
    )
  }

  return (
    <>
      <PageLayout
        title={data ? `Account ${data.accountNumber}` : 'Account'}
        actions={
          <>
            {isTeller && data?.status === 'ACTIVE' && (
              <>
                <Button onClick={() => setCashMode('deposit')}>Deposit</Button>
                <Button onClick={() => setCashMode('withdraw')}>Withdraw</Button>
              </>
            )}
            {data?.status === 'ACTIVE' && (
              <ButtonLink variant="primary" to={`/transfer?from=${accountId}`}>
                Send money
              </ButtonLink>
            )}
          </>
        }
      >
        <nav aria-label="Breadcrumb" className="-mt-2 mb-5">
          <Link to="/accounts" className="t-micro inline-flex items-center gap-1 hover:text-ink">
            Accounts
            <IconChevronRight className="h-3 w-3" />
          </Link>
        </nav>

        <StatStrip
          className="mb-8"
          stats={[
            {
              label: 'Balance',
              value: data ? (
                <Money
                  minorUnits={data.balanceMinorUnits}
                  currency={data.currency}
                  variant="balance"
                  className="t-figure"
                />
              ) : (
                <span className="t-figure text-ink-faint">—</span>
              ),
              note: data?.currency,
            },
            { label: 'Holder', value: <span className="t-row">{data?.ownerUsername ?? 'The institution'}</span> },
            {
              label: 'Type',
              value: <span className="t-row">{data ? titleCase(data.accountType) : '—'}</span>,
              note: data ? `Opened ${formatShortDate(data.createdAt)}` : undefined,
            },
            {
              label: 'Status',
              value: data ? (
                <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
              ) : (
                '—'
              ),
              note: data?.status === 'INACTIVE' ? 'No money can move in or out' : undefined,
            },
          ]}
        />

        <Section title="Statement">
          <AsyncSection
            data={ledger.data}
            loading={ledger.loading}
            error={ledger.error}
            onRetry={ledger.reload}
            skeleton={<TableSkeleton rows={8} columns={5} />}
          >
            {(entries) => (
              <DataTable
                caption="Account statement"
                columns={columns}
                rows={entries.items}
                rowKey={(row) => row.id}
                emptyState={
                  <EmptyState
                    title="No postings yet"
                    description={
                      isTeller
                        ? 'Record a deposit to give this account its opening balance.'
                        : 'Transactions against this account will appear here.'
                    }
                    action={
                      isTeller && data?.status === 'ACTIVE' ? (
                        <Button variant="primary" onClick={() => setCashMode('deposit')}>
                          Record a deposit
                        </Button>
                      ) : undefined
                    }
                  />
                }
                footer={
                  <Pagination
                    page={entries.page}
                    size={entries.size}
                    totalItems={entries.totalItems}
                    onPageChange={(next) =>
                      setParams((current) => {
                        const params = new URLSearchParams(current)
                        params.set('page', String(next))
                        return params
                      })
                    }
                    noun="entries"
                  />
                }
              />
            )}
          </AsyncSection>
          <p className="t-body mt-3 max-w-[70ch] text-ink-3">
            Entries are append-only: the database rejects any update or delete against them, so a
            correction is posted as a new transaction rather than by editing history.
          </p>
        </Section>

        {isAdmin && data && data.status !== 'CLOSED' && (
          <Section title="Manage">
            <div className="flex flex-wrap gap-2">
              {data.status === 'ACTIVE' ? (
                <Button onClick={() => setPendingStatus('INACTIVE')}>Freeze account</Button>
              ) : (
                <Button onClick={() => setPendingStatus('ACTIVE')}>Reactivate account</Button>
              )}
              <Button variant="danger" onClick={() => setPendingStatus('CLOSED')}>
                Close account
              </Button>
            </div>
            <p className="t-body mt-3 max-w-[70ch] text-ink-3">
              Closing is permanent. A closed account can never reopen or transact again, and its
              balance must already be zero.
            </p>
          </Section>
        )}
      </PageLayout>

      <CashModal
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

      <Modal
        open={pendingStatus !== null}
        onClose={() => setPendingStatus(null)}
        title={
          pendingStatus === 'CLOSED'
            ? 'Close this account?'
            : pendingStatus === 'INACTIVE'
              ? 'Freeze this account?'
              : 'Reactivate this account?'
        }
        description={
          pendingStatus === 'CLOSED'
            ? 'This cannot be undone. A closed account can never reopen or transact again.'
            : pendingStatus === 'INACTIVE'
              ? 'While frozen, no money can move in or out. You can reactivate it at any time.'
              : 'Reactivating allows this account to send and receive money again.'
        }
        confirmLabel={pendingStatus === 'CLOSED' ? 'Close permanently' : 'Confirm'}
        destructive={pendingStatus === 'CLOSED'}
        confirmLoading={statusSubmitting}
        onConfirm={applyStatus}
      />
    </>
  )
}

function CashModal({
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
    // Checked here only for a faster answer. The server enforces this
    // authoritatively inside the row lock, which is the check that counts.
    if (!isDeposit && minorUnits > availableMinorUnits) {
      setFieldError(`Only ${formatMinorUnits(availableMinorUnits, currency)} is available.`)
      return
    }
    setFieldError(null)
    setSubmitting(true)

    try {
      const call = isDeposit ? accountsApi.deposit : accountsApi.withdraw
      const result = await call(accountId, {
        amountMinorUnits: minorUnits,
        reference: reference.trim() || (isDeposit ? 'Deposit' : 'Withdrawal'),
      })
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
    <Modal
      open={mode !== null}
      onClose={() => {
        reset()
        onClose()
      }}
      title={isDeposit ? 'Record a deposit' : 'Record a withdrawal'}
      description={
        isDeposit
          ? 'Cash entering the ledger is debited from the branch vault, so the books stay balanced.'
          : 'Cash leaving the ledger is credited back to the branch vault.'
      }
      confirmLabel={isDeposit ? 'Deposit' : 'Withdraw'}
      onConfirm={() => submit()}
      confirmLoading={submitting}
    >
      <form onSubmit={submit} noValidate>
        {error && (
          <div className="mb-4">
            <ErrorState message={error} />
          </div>
        )}
        <Field
          label="Amount"
          error={fieldError ?? undefined}
          hint={!isDeposit ? `${formatMinorUnits(availableMinorUnits, currency)} available` : undefined}
        >
          {(id, describedBy) => (
            <AmountInput
              id={id}
              aria-describedby={describedBy}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setFieldError(null)
              }}
              placeholder="0.00"
              autoFocus
            />
          )}
        </Field>
        <Field label="Reference">
          {(id) => (
            <TextInput
              id={id}
              placeholder={isDeposit ? 'Counter deposit' : 'ATM withdrawal'}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={140}
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}
