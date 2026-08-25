import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { accountsApi, transfersApi } from '../api/endpoints'
import { Button } from '../components/ui/Button'
import { AmountInput, SelectInput, TextInput } from '../components/ui/Field'
import { ListSection } from '../components/ui/List'
import { ErrorState, PageHeader, Skeleton } from '../components/ui/Surface'
import { useToast } from '../components/ui/Toast'
import { formatAccountNumber, formatMinorUnits, parseMajorUnits } from '../lib/money'
import { useAsync } from '../lib/useAsync'
import { titleCase } from '../lib/text'

/**
 * Money entry leads with the amount at display size, the way Apple Cash does:
 * the number is the whole point of the screen and everything else is a detail
 * that supports it.
 */
export function TransferPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const accounts = useAsync(() => accountsApi.list(), [])

  const [sourceId, setSourceId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Frozen and closed accounts are filtered out of both pickers rather than
  // offered and then rejected after the form is filled in.
  const transferable = useMemo(
    () => (accounts.data ?? []).filter((a) => a.status === 'ACTIVE' && a.accountType !== 'SYSTEM'),
    [accounts.data],
  )
  const source = transferable.find((a) => a.id === Number(sourceId))
  const destinations = transferable.filter((a) => a.id !== Number(sourceId))

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!sourceId) next.source = 'Choose the account the money leaves from.'
    if (!destinationId) next.destination = 'Choose where the money is going.'

    const minorUnits = parseMajorUnits(amount)
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
        amountMinorUnits: parseMajorUnits(amount)!,
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
      <div>
        <PageHeader title="Send money" />
        <div className="px-4 sm:px-0">
          <Skeleton className="mx-auto h-16 w-52" />
          <Skeleton className="mt-8 h-40 w-full rounded-[var(--radius-card)]" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Send money" />

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-8 px-4 sm:px-0">
          <AmountInput
            value={amount}
            onChange={(next) => {
              setAmount(next)
              setErrors((p) => ({ ...p, amount: '' }))
            }}
            error={errors.amount || undefined}
            hint={source ? `${formatMinorUnits(source.balanceMinorUnits, source.currency)} available` : 'Both sides post together — the money is never in neither place.'}
            autoFocus
          />
        </div>

        {formError && (
          <div className="mb-6 px-4 sm:px-0">
            <ErrorState message={formError} />
          </div>
        )}
        {accounts.error && (
          <div className="mb-6 px-4 sm:px-0">
            <ErrorState message={accounts.error} onRetry={accounts.reload} />
          </div>
        )}

        <ListSection>
          <div className="space-y-4 p-4">
            <SelectInput
              label="From"
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value)
                if (e.target.value === destinationId) setDestinationId('')
                setErrors((p) => ({ ...p, source: '' }))
              }}
              error={errors.source || undefined}
            >
              <option value="">Choose an account</option>
              {transferable.map((a) => (
                <option key={a.id} value={a.id}>
                  {titleCase(a.accountType)} ···· {a.accountNumber.slice(-4)} — {formatMinorUnits(a.balanceMinorUnits, a.currency)}
                </option>
              ))}
            </SelectInput>

            <SelectInput
              label="To"
              value={destinationId}
              onChange={(e) => {
                setDestinationId(e.target.value)
                setErrors((p) => ({ ...p, destination: '' }))
              }}
              error={errors.destination || undefined}
              disabled={!sourceId}
              hint={!sourceId ? 'Choose the source account first.' : undefined}
            >
              <option value="">Choose an account</option>
              {destinations.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatAccountNumber(a.accountNumber)} — {a.ownerUsername ?? titleCase(a.accountType)}
                </option>
              ))}
            </SelectInput>

            <TextInput
              label="Reference"
              placeholder="Rent for July"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value)
                setErrors((p) => ({ ...p, reference: '' }))
              }}
              error={errors.reference || undefined}
              maxLength={140}
            />
          </div>
        </ListSection>

        <div className="px-4 sm:px-0">
          <Button type="submit" variant="filled" size="lg" fullWidth loading={submitting}>
            {submitting ? 'Sending' : 'Send transfer'}
          </Button>
        </div>
      </form>
    </div>
  )
}
