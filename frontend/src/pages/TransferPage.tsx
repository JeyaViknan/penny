import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { accountsApi, transfersApi } from '../api/endpoints'
import { Button } from '../components/ui/Button'
import { SelectInput, TextInput } from '../components/ui/Field'
import { Card, ErrorState, PageHeader, Skeleton } from '../components/ui/Surface'
import { useToast } from '../components/ui/Toast'
import { formatAccountNumber, formatMinorUnits, parseMajorUnits } from '../lib/money'
import { useAsync } from '../lib/useAsync'

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

  const transferable = useMemo(
    () => (accounts.data ?? []).filter((a) => a.status === 'ACTIVE' && a.accountType !== 'SYSTEM'),
    [accounts.data],
  )
  const source = transferable.find((a) => a.id === Number(sourceId))

  // A frozen account can receive nothing and a closed one cannot transact at
  // all, so they are filtered out of both pickers rather than offered and then
  // rejected by the server after the user has filled in the whole form.
  const destinations = transferable.filter((a) => a.id !== Number(sourceId))

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!sourceId) next.source = 'Choose the account the money leaves from.'
    if (!destinationId) next.destination = 'Choose where the money is going.'

    const minorUnits = parseMajorUnits(amount)
    if (minorUnits === null) {
      next.amount = 'Enter an amount greater than zero, with at most two decimal places.'
    } else if (source && minorUnits > source.balanceMinorUnits) {
      next.amount = `Only ${formatMinorUnits(source.balanceMinorUnits, source.currency)} is available.`
    }

    if (!reference.trim()) next.reference = 'Add a reference so this transfer can be recognised later.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
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

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Send money"
        description="Both sides of the transfer are posted together — the money is never in neither place."
      />

      <Card>
        {accounts.loading ? (
          <div className="space-y-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {formError && <ErrorState message={formError} />}
            {accounts.error && <ErrorState message={accounts.error} onRetry={accounts.reload} />}

            <SelectInput
              label="From"
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value)
                // Clearing prevents an invalid same-account pair being left
                // behind when the source changes to match the destination.
                if (e.target.value === destinationId) setDestinationId('')
                setErrors((p) => ({ ...p, source: '' }))
              }}
              error={errors.source || undefined}
              hint={source ? `${formatMinorUnits(source.balanceMinorUnits, source.currency)} available` : undefined}
            >
              <option value="">Select an account</option>
              {transferable.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatAccountNumber(a.accountNumber)} · {a.accountType} · {formatMinorUnits(a.balanceMinorUnits, a.currency)}
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
              <option value="">Select an account</option>
              {destinations.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatAccountNumber(a.accountNumber)} · {a.ownerUsername ?? a.accountType}
                </option>
              ))}
            </SelectInput>

            <TextInput
              label="Amount"
              prefix="$"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setErrors((p) => ({ ...p, amount: '' }))
              }}
              error={errors.amount || undefined}
            />

            <TextInput
              label="Reference"
              placeholder="e.g. Rent for July"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value)
                setErrors((p) => ({ ...p, reference: '' }))
              }}
              error={errors.reference || undefined}
              maxLength={140}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
              {submitting ? 'Sending' : 'Send transfer'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
