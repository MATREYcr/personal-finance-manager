'use client'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecurringTransactions } from '../hooks/useRecurringTransactions'
import { useRecurringTransactionMutations } from '../hooks/useRecurringTransactionMutations'
import { RecurringTransactionFormDialog } from './RecurringTransactionFormDialog'
import type { RecurringTransactionWithCategory } from '../types'

const frequencyKey = { WEEKLY: 'frequencyWeekly', MONTHLY: 'frequencyMonthly', YEARLY: 'frequencyYearly' } as const

export function RecurringTransactionList() {
  const t = useTranslations('RecurringTransactions')
  const tCategories = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { data: rules, isLoading } = useRecurringTransactions()
  const { toggleActive, remove } = useRecurringTransactionMutations()

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label={t('loading')} aria-busy>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecurringTransactionFormDialog trigger={<Button>{t('new')}</Button>} />
      </div>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnCategory')}</TableHead>
              <TableHead>{t('columnType')}</TableHead>
              <TableHead className="text-right">{t('columnAmount')}</TableHead>
              <TableHead>{t('columnFrequency')}</TableHead>
              <TableHead>{t('columnNextRun')}</TableHead>
              <TableHead>{t('columnStatus')}</TableHead>
              <TableHead className="text-right">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rules as RecurringTransactionWithCategory[] | undefined)?.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.category.name}</TableCell>
                <TableCell>{rule.type === 'EXPENSE' ? tCategories('typeExpense') : tCategories('typeIncome')}</TableCell>
                <TableCell className="text-right">{Number(rule.amount).toFixed(2)} {rule.currency}</TableCell>
                <TableCell>{t(frequencyKey[rule.frequency])}</TableCell>
                {/* nextRunDate is a calendar date (stored as UTC midnight), not
                    a timestamp — format in UTC so the day shown matches what
                    was entered regardless of the viewer's own timezone
                    (otherwise a negative UTC offset rolls it back a day, e.g.
                    UTC midnight July 6 reads as July 5 evening in
                    America/Bogota). Same fix as Transactions' TransactionList. */}
                <TableCell>{new Date(rule.nextRunDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}</TableCell>
                <TableCell>
                  <Badge variant={rule.active ? 'default' : 'secondary'} className="gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${rule.active ? 'bg-(--positive)' : 'bg-muted-foreground'}`}
                    />
                    {rule.active ? t('statusActive') : t('statusPaused')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <RecurringTransactionFormDialog
                    rule={rule}
                    trigger={
                      <Button size="icon" aria-label={tCommon('edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  {rule.active ? (
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={t('pause')}
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate({ id: rule.id, active: false })}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      aria-label={t('resume')}
                      className="bg-(--positive) text-white hover:opacity-90"
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate({ id: rule.id, active: true })}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label={tCommon('delete')}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Surface mutation failures — a silently-swallowed pause/resume is
          especially bad here: the user would believe a rule is paused when
          it isn't, and the generation cron would keep running it. */}
      {(toggleActive.isError || remove.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {((toggleActive.error ?? remove.error) as Error)?.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
