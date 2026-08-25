import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { accountsApi, transfersApi } from '../api/endpoints'
import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { AmountInput, Field, Select, TextInput } from '../components/ui/Field'
import { Money } from '../components/ui/Money'
import { ErrorState, Shimmer } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { maskAccount } from '../lib/format'
import { formatMinorUnits, parseMajorUnits } from '../lib/money'
import { titleCase } from '../lib/text'
import { useAsync } from '../lib/useAsync'

/**
 * Posting a transfer.
 *
 * <p>One column at every width, because a two-column money form invites the eye
 * to jump between fields in an order the transaction does not follow. The order
 * here is the order of the sentence someone would say out loud: this much, from
 * here, to there, for this.
 *
 * <p>The review block appears only once the form is valid. That makes
 * confirmation deliberate without adding a second step to walk through — and it
 * states plainly that the transfer posts as a balanced debit and credit, which
 * is the fact that distinguishes this from a number changing in two places.
 */
export function TransferPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [params] = useSearchParams()
  const accounts = useAsync(() => accountsApi.list(), [])

  const [sourceId, setSourceId] = useState(params.get('from') ?? '')
  const [destinationId, setDestinationId] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Frozen and closed accounts are filtered out of both pickers rather than
  // offered and then rejected once the form is filled in. The cash vault is
  // excluded too: it is the counterparty for deposits, never a transfer party.
  const transferable = useMemo(
    () => (accounts.data ?? []).filter((a) => a.status === 'ACTIVE' && a.accountType !== 'SYSTEM'),
    [accounts.data],
  )
  const source = transferable.find((a) => a.id === Number(sourceId))
  const destination = transferable.find((a) => a.id === Number(destinationId))
  const destinations = transferable.filter((a) => a.id !== Number(sourceId))

  // A ?from= that names an account this person cannot send from is dropped
  // rather than left selected as something the server would refuse.
  useEffect(() => {
    if (sourceId && accounts.data && !source) setSourceId('')
  }, [accounts.data, source, sourceId])

  const minorUnits = parseMajorUnits(amount)
  const ready =
    Boolean(source) &&
    Boolean(destination) &&
    minorUnits !== null &&
    minorUnits <= (source?.balanceMinorUnits ?? 0) &&
    reference.trim().length > 0

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!sourceId) next.source = 'Choose the account the money leaves from.'
    if (!destinationId) next.destination = 'Choose where the money is going.'
    if (minorUnits === null) {
      next.amount = 'Enter an amount greater than zero.'
    } else if (source && minorUnits > source.balanceMinorUnits) {
      next.amount = `Only ${formatMinorUnits(source.balanceMinorUnits, source.currency)} available.`
    }
    if (!reference.trim()) next.reference = 'Add a reference so this can be recognised later.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault()
    setFormError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const result = await transfersApi.create({
        sourceAccountId: Number(sourceId),
        destinationAccountId: Number(destinationId),
        amountMinorUnits: minorUnits!,
        reference: reference.trim(),
      })
      notify(`Sent ${formatMinorUnits(result.amountMinorUnits)}`, 'success')
      navigate(`/transfers/${result.transactionId}`)
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (accounts.loading) {
    return (
      <PageLayout title="Send money" width="measure">
        <Shimmer className="h-12 w-48" />
        <Shimmer className="mt-8 h-9 w-full" />
        <Shimmer className="mt-6 h-9 w-full" />
      </PageLayout>
    )
  }

  if (transferable.length < 2) {
    return (
      <PageLayout title="Send money" width="measure">
        <p className="t-body text-ink-2">
          A transfer needs two active accounts. {transferable.length === 0 ? 'None are' : 'Only one is'}{' '}
          available to you right now — an account that is frozen or closed cannot send or receive
          money.
        </p>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Send money" width="measure">
      <form onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="mb-6">
            <ErrorState message={formError} />
          </div>
        )}

        <Field label="Amount" error={errors.amount || undefined}>
          {(id, describedBy) => (
            <AmountInput
              id={id}
              aria-describedby={describedBy}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setErrors((previous) => ({ ...previous, amount: '' }))
              }}
              placeholder="0.00"
              autoFocus
            />
          )}
        </Field>

        <Field label="From" error={errors.source || undefined}>
          {(id) => (
            <Select
              id={id}
              value={sourceId}
              onChange={(event) => {
                setSourceId(event.target.value)
                if (event.target.value === destinationId) setDestinationId('')
                setErrors((previous) => ({ ...previous, source: '' }))
              }}
            >
              <option value="">Choose an account</option>
              {transferable.map((account) => (
                <option key={account.id} value={account.id}>
                  {titleCase(account.accountType)} {maskAccount(account.accountNumber)} ·{' '}
                  {formatMinorUnits(account.balanceMinorUnits, account.currency)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="To" error={errors.destination || undefined}>
          {(id) => (
            <Select
              id={id}
              value={destinationId}
              onChange={(event) => {
                setDestinationId(event.target.value)
                setErrors((previous) => ({ ...previous, destination: '' }))
              }}
            >
              <option value="">Choose an account</option>
              {destinations.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.ownerUsername ?? 'The institution'} · {titleCase(account.accountType)}{' '}
                  {maskAccount(account.accountNumber)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Reference" error={errors.reference || undefined}>
          {(id) => (
            <TextInput
              id={id}
              value={reference}
              onChange={(event) => {
                setReference(event.target.value)
                setErrors((previous) => ({ ...previous, reference: '' }))
              }}
              placeholder="Rent, invoice 402, …"
              maxLength={140}
            />
          )}
        </Field>

        {ready && source && destination && minorUnits !== null && (
          <div className="mt-8 border-t border-line pt-5">
            <h2 className="t-col mb-2">Review</h2>
            <p className="t-body text-ink">
              <Money minorUnits={minorUnits} currency={source.currency} className="text-[14px]" /> from{' '}
              {maskAccount(source.accountNumber)} to {maskAccount(destination.accountNumber)}
              {destination.ownerUsername ? `, held by ${destination.ownerUsername}` : ''}.
            </p>
            <p className="t-body mt-1 text-ink-3">
              Posts as one debit and one credit of equal value, in a single transaction. If the
              request is retried it will not post twice.
            </p>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="mt-4"
            >
              Confirm transfer
            </Button>
          </div>
        )}

        {!ready && (
          <div className="mt-8 border-t border-line pt-5">
            <Button type="submit" variant="primary" size="lg" loading={submitting}>
              Confirm transfer
            </Button>
            <p className="t-micro mt-2">Fill in every field to see the review before posting.</p>
          </div>
        )}
      </form>
    </PageLayout>
  )
}
