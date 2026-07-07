'use client'
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useTransactions } from '../hooks/useTransactions'
import { useTransactionMutations } from '../hooks/useTransactionMutations'
import { TransactionFilters } from './TransactionFilters'
import { TransactionFormDialog } from './TransactionFormDialog'
import { getTotalPages } from '../pagination'
import type { TransactionFilters as Filters } from '../types'

export function TransactionList() {
  const t = useTranslations('Transactions')
  const tCategories = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)
  const { data, isLoading } = useTransactions(filters, page)
  const { remove } = useTransactionMutations()

  // Changing filters invalidates what "page 2" even means, so always land back
  // on page 1. Reset it directly in the change handler (rather than in a
  // useEffect keyed on `filters`) to avoid deriving state in an effect.
  function handleFiltersChange(next: Filters) {
    setFilters(next)
    setPage(1)
  }

  const totalPages = data ? getTotalPages(data.totalCount) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TransactionFilters filters={filters} onChange={handleFiltersChange} />
        <TransactionFormDialog trigger={<Button>{t('newTransaction')}</Button>} />
      </div>

      {isLoading || !data ? (
        <div className="space-y-3" aria-label={t('loading')} aria-busy>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columnDate')}</TableHead>
                  <TableHead>{t('columnCategory')}</TableHead>
                  <TableHead>{t('columnType')}</TableHead>
                  <TableHead className="text-right">{t('columnAmount')}</TableHead>
                  <TableHead className="text-right">{t('columnActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    {/* Transaction dates are calendar dates (stored as UTC
                        midnight), not timestamps — format in UTC so the day
                        shown matches what was entered regardless of the
                        viewer's own timezone (otherwise a negative UTC offset
                        rolls it back a day, e.g. UTC midnight July 6 reads as
                        July 5 evening in America/Bogota). */}
                    <TableCell>{new Date(tx.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</TableCell>
                    <TableCell>{tx.category.name}</TableCell>
                    <TableCell>{tx.type === 'EXPENSE' ? tCategories('typeExpense') : tCategories('typeIncome')}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        tx.type === 'INCOME' ? 'text-(--positive)' : 'text-destructive'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '−'}{Number(tx.amount).toFixed(2)} {tx.currency}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <TransactionFormDialog
                        transaction={tx}
                        trigger={
                          <Button size="icon" aria-label={tCommon('edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label={tCommon('delete')}
                        disabled={remove.isPending}
                        onClick={() =>
                          remove.mutate(tx.id, {
                            onSuccess: () => {
                              // If this was the only row left on a page beyond
                              // the first, deleting it would strand the user on
                              // a now-empty out-of-range page ("Page 2 of 1").
                              // Step back a page so they land on real rows.
                              if (data.transactions.length === 1 && page > 1) {
                                setPage((p) => p - 1)
                              }
                            },
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('pageInfo', { page, totalPages })}</p>
            {/* Pagination is a link-styled component; here it drives client
                state, so prev/next carry onClick + aria-disabled (anchors
                can't be natively disabled) rather than navigating by href. */}
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    text={t('previous')}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    text={t('next')}
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
          {remove.isError && (
            <Alert variant="destructive">
              <AlertDescription>{(remove.error as Error).message}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}
