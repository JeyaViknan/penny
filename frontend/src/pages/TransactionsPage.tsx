import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ledgerApi, transfersApi } from '../api/endpoints'
import type {
  SortDirection,
  TransactionSort,
  TransactionSummaryResponse,
  TransactionType,
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageLayout } from '../components/layout/PageLayout'
import { Badge } from '../components/ui/Badge'
import { DataTable, type Column, type SortState } from '../components/ui/DataTable'
import { Money } from '../components/ui/Money'
import { Drawer } from '../components/ui/Overlay'
import { AsyncSection, EmptyState, TableSkeleton } from '../components/ui/States'
import {
  ClearFilters,
  FilterSelect,
  Pagination,
  SearchInput,
  Toolbar,
} from '../components/ui/Toolbar'
import { counterpartyDetail, counterpartyName, formatShortDate, maskAccount } from '../lib/format'
import { formatDateTime } from '../lib/money'
import { humanise } from '../lib/text'
import { useAsync } from '../lib/useAsync'
import { useDebounced } from '../lib/useDebounced'

const PAGE_SIZE = 50

const TYPE_OPTIONS = [
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
]

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

/**
 * The centrepiece: every transaction in the ledger, as a table.
 *
 * <p>What makes this a ledger rather than a feed is that the filters are real.
 * Search, type, date range and sort are all applied in SQL against the whole
 * dataset, so "1–50 of 3,214" narrows to a true total rather than to whatever
 * happened to be on screen. A filter that only filters the visible page is worse
 * than no filter, because it answers a question wrongly instead of declining to
 * answer it.
 *
 * <p>Filter state lives in the URL. That makes a filtered view something you can
 * bookmark, share with a colleague, and reach with the back button — which is
 * most of what "workspace" means in practice.
 */
export function TransactionsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  const [searchText, setSearchText] = useState(params.get('q') ?? '')
  const query = useDebounced(searchText)

  const type = params.get('type') ?? ''
  const range = params.get('range') ?? ''
  const sortKey = (params.get('sort') as TransactionSort) ?? 'DATE'
  const direction = (params.get('direction') as SortDirection) ?? 'DESC'
  const page = Number(params.get('page') ?? 0)

  const [openTransaction, setOpenTransaction] = useState<TransactionSummaryResponse | null>(null)

  // Typing into search resets to the first page; staying on page 4 of a result
  // set that now has one page shows an empty table and looks like no matches.
  useEffect(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (query) next.set('q', query)
        else next.delete('q')
        if (query !== (current.get('q') ?? '')) next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [query, setParams])

  const from = useMemo(() => {
    if (!range) return undefined
    const since = new Date()
    since.setDate(since.getDate() - Number(range))
    return since.toISOString()
  }, [range])

  const history = useAsync(
    () =>
      transfersApi.history({
        q: query || undefined,
        type: type ? [type as TransactionType] : undefined,
        from,
        sort: sortKey,
        direction,
        page,
        size: PAGE_SIZE,
      }),
    [query, type, from, sortKey, direction, page],
  )

  function update(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      // Any change to what is being asked for starts again at page one.
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const filtered = Boolean(query || type || range)

  const columns = useMemo<Column<TransactionSummaryResponse>[]>(
    () => [
      {
        key: 'DATE',
        header: 'Date',
        width: '92px',
        sortable: true,
        render: (row) => (
          <span className="t-row whitespace-nowrap text-ink-2" title={formatDateTime(row.createdAt)}>
            {formatShortDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'reference',
        header: 'Reference',
        render: (row) => (
          <span className="t-row block truncate font-medium text-ink">{row.reference}</span>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        width: '110px',
        minWidth: 'lg',
        render: (row) => <Badge>{humanise(row.transactionType)}</Badge>,
      },
      {
        key: 'from',
        header: 'From',
        width: '150px',
        render: (row) => (
          <Party name={row.debitOwnerUsername} accountNumber={row.debitAccountNumber} />
        ),
      },
      {
        key: 'to',
        header: 'To',
        width: '150px',
        render: (row) => (
          <Party name={row.creditOwnerUsername} accountNumber={row.creditAccountNumber} />
        ),
      },
      {
        key: 'by',
        header: 'Initiated by',
        width: '120px',
        minWidth: 'xl',
        render: (row) => (
          <span className="t-row truncate text-ink-2">{row.initiatedByUsername ?? '—'}</span>
        ),
      },
      {
        key: 'AMOUNT',
        header: 'Amount',
        align: 'right',
        width: '120px',
        sortable: true,
        render: (row) => <Money minorUnits={row.amountMinorUnits} />,
      },
    ],
    [],
  )

  return (
    <>
      <PageLayout
        title="Transactions"
        description={
          user?.role === 'CUSTOMER'
            ? 'Every movement touching your accounts, oldest records included.'
            : undefined
        }
        toolbar={
          <Toolbar>
            <SearchInput value={searchText} onChange={setSearchText} placeholder="Search reference" />
            <FilterSelect label="Type" value={type} onChange={(v) => update('type', v)} options={TYPE_OPTIONS} />
            <FilterSelect label="Date" value={range} onChange={(v) => update('range', v)} options={RANGE_OPTIONS} />
            <ClearFilters
              show={filtered}
              onClear={() => {
                setSearchText('')
                setParams(new URLSearchParams())
              }}
            />
          </Toolbar>
        }
      >
        <AsyncSection
          data={history.data}
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
          skeleton={<TableSkeleton rows={12} columns={6} />}
        >
          {(data) => (
            <DataTable
              caption="Transactions"
              columns={columns}
              rows={data.items}
              rowKey={(row) => row.transactionId}
              onOpenRow={setOpenTransaction}
              selectedKey={openTransaction?.transactionId ?? null}
              sort={{ key: sortKey, direction } as SortState}
              onSortChange={(next) => {
                update('sort', next.key)
                update('direction', next.direction)
              }}
              emptyState={
                <EmptyState
                  title={filtered ? 'No transactions match those filters' : 'No transactions yet'}
                  description={
                    filtered
                      ? 'Try widening the date range or clearing the search.'
                      : 'Money movement will appear here as soon as the first transfer is posted.'
                  }
                />
              }
              footer={
                <Pagination
                  page={data.page}
                  size={data.size}
                  totalItems={data.totalItems}
                  onPageChange={(next) => update('page', String(next))}
                  noun="transactions"
                />
              }
            />
          )}
        </AsyncSection>
      </PageLayout>

      <TransactionDrawer
        transaction={openTransaction}
        onClose={() => setOpenTransaction(null)}
        canSeeLegs={user?.role !== 'CUSTOMER'}
      />
    </>
  )
}

/** A counterparty cell: who, then which account of theirs. */
function Party({ name, accountNumber }: { name: string | null; accountNumber: string }) {
  return (
    <span className="block min-w-0" title={accountNumber}>
      <span className="t-row block truncate text-ink">{counterpartyName(name)}</span>
      <span className="t-micro block truncate">{counterpartyDetail(name, accountNumber)}</span>
    </span>
  )
}

/**
 * The detail panel. It shows the two ledger entries the transaction actually
 * posted — which is the thing this product is about, and which no amount of
 * summary text conveys as convincingly as the two rows sitting there summing to
 * zero.
 */
function TransactionDrawer({
  transaction,
  onClose,
  canSeeLegs,
}: {
  transaction: TransactionSummaryResponse | null
  onClose: () => void
  canSeeLegs: boolean
}) {
  const id = transaction?.transactionId
  const legs = useAsync(
    () => (id && canSeeLegs ? ledgerApi.forTransaction(id) : Promise.resolve([])),
    [id, canSeeLegs],
  )

  if (!transaction) return null

  return (
    <Drawer
      open
      onClose={onClose}
      title={transaction.reference}
      subtitle={`Transaction #${transaction.transactionId}`}
    >
      <dl className="divide-y divide-[var(--border)]">
        <Row label="Amount">
          <Money minorUnits={transaction.amountMinorUnits} className="text-[16px]" />
        </Row>
        <Row label="Type">
          <Badge>{humanise(transaction.transactionType)}</Badge>
        </Row>
        <Row label="Posted">{formatDateTime(transaction.createdAt)}</Row>
        <Row label="From">
          {counterpartyName(transaction.debitOwnerUsername)}
          <span className="t-ident ml-2 text-ink-3">{maskAccount(transaction.debitAccountNumber)}</span>
        </Row>
        <Row label="To">
          {counterpartyName(transaction.creditOwnerUsername)}
          <span className="t-ident ml-2 text-ink-3">{maskAccount(transaction.creditAccountNumber)}</span>
        </Row>
        <Row label="Initiated by">{transaction.initiatedByUsername ?? 'System'}</Row>
      </dl>

      {canSeeLegs && (
        <div className="border-t border-line px-4 py-4">
          <h3 className="t-col mb-2">Ledger entries</h3>
          <p className="t-body mb-3 text-ink-2">
            Every transaction posts exactly one debit and one credit of equal value. That is why
            the books balance: nothing here creates or destroys money, it only moves it.
          </p>
          {legs.loading ? (
            <TableSkeleton rows={2} columns={3} />
          ) : (
            <table className="w-full">
              <tbody>
                {legs.data?.map((leg) => (
                  <tr key={leg.id} className="border-b border-line last:border-b-0">
                    <td className="h-[var(--h-row)] pr-3">
                      <Badge tone={leg.entryType === 'CREDIT' ? 'positive' : 'neutral'}>
                        {humanise(leg.entryType)}
                      </Badge>
                    </td>
                    <td className="t-micro pr-3">Account #{leg.accountId}</td>
                    <td className="text-right">
                      <Money
                        minorUnits={leg.entryType === 'CREDIT' ? leg.amountMinorUnits : -leg.amountMinorUnits}
                        variant="signed"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Drawer>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="t-col shrink-0">{label}</dt>
      <dd className="t-row min-w-0 truncate text-right text-ink">{children}</dd>
    </div>
  )
}
