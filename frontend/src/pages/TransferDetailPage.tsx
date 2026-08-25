import { useNavigate, useParams } from 'react-router-dom'
import { transfersApi } from '../api/endpoints'
import { IconArrowLeft, IconDeposit, IconTransfer, IconWithdraw } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { ListRow, ListSection } from '../components/ui/List'
import { EmptyState, Skeleton } from '../components/ui/Surface'
import { formatAccountNumber, formatDateTime, formatMinorUnits, isVaultSide } from '../lib/money'
import { useAsync } from '../lib/useAsync'
import { titleCase } from '../lib/text'

/**
 * The receipt. Apple leads these with a large glyph and the amount, then puts
 * the particulars in a grouped list underneath — you see what happened before
 * you read any of the detail.
 */
export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const transfer = useAsync(() => transfersApi.get(Number(id)), [id])
  const data = transfer.data

  if (transfer.error) {
    return (
      <div className="px-4 sm:px-0">
        <BackButton onClick={() => navigate(-1)} />
        <div className="list-group">
          <EmptyState
            title="This transaction could not be opened"
            description={transfer.error}
            action={
              <div className="flex gap-2">
                <Button onClick={transfer.reload}>Try again</Button>
                <Button variant="filled" asLink="/activity">All activity</Button>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  const style = data ? TYPE_STYLE[data.transactionType] : null

  return (
    <div>
      <div className="px-4 sm:px-0">
        <BackButton onClick={() => navigate(-1)} />
      </div>

      <div className="mb-8 flex flex-col items-center px-4 text-center sm:px-0">
        {transfer.loading || !data || !style ? (
          <>
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="mt-4 h-11 w-40" />
            <Skeleton className="mt-3 h-4 w-28" />
          </>
        ) : (
          <>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: style.color }}
            >
              {style.icon}
            </div>
            <p className="t-money mt-4 text-[40px] font-semibold leading-none text-[var(--label)]">
              {formatMinorUnits(data.amountMinorUnits)}
            </p>
            <p className="t-subhead mt-2.5 text-[var(--label-secondary)]">
              {titleCase(data.transactionType)} · {data.reference}
            </p>
          </>
        )}
      </div>

      <ListSection header="Details" footer="Posted transactions are immutable. Nothing here can be edited or removed.">
        {transfer.loading || !data ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <>
            <ListRow title="Reference" value={data.reference} />
            <AccountRow
              label="From"
              isVault={isVaultSide(data.transactionType, 'debit')}
              id={data.sourceAccountId}
              number={data.sourceAccountNumber}
            />
            <AccountRow
              label="To"
              isVault={isVaultSide(data.transactionType, 'credit')}
              id={data.destinationAccountId}
              number={data.destinationAccountNumber}
            />
            <ListRow title="Posted" value={formatDateTime(data.createdAt)} />
            <ListRow title="Transaction" value={<span className="t-money">#{data.transactionId}</span>} />
          </>
        )}
      </ListSection>
    </div>
  )
}

const TYPE_STYLE = {
  DEPOSIT: { icon: <IconDeposit className="h-7 w-7" />, color: 'var(--green-fill)' },
  WITHDRAWAL: { icon: <IconWithdraw className="h-7 w-7" />, color: 'var(--orange-fill)' },
  TRANSFER: { icon: <IconTransfer className="h-7 w-7" />, color: 'var(--blue)' },
}

/**
 * Shows "Cash vault" rather than the institution's internal account number —
 * that number is an implementation detail of double-entry, not something a
 * person should have to decode.
 */
function AccountRow({ label, isVault, id, number }: { label: string; isVault: boolean; id: number; number: string }) {
  if (isVault) {
    return <ListRow title={label} value={<span className="text-[var(--label-secondary)]">Cash vault</span>} />
  }
  return <ListRow title={label} to={`/accounts/${id}`} value={<span className="t-money">{formatAccountNumber(number)}</span>} />
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="t-body mb-4 inline-flex items-center gap-0.5 text-[var(--blue)] active:opacity-55">
      <IconArrowLeft className="h-[18px] w-[18px]" />
      Back
    </button>
  )
}
