'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useRecurringTransactionMutations } from '../hooks/useRecurringTransactionMutations'
import type { RecurringTransactionWithCategory } from '../types'
import type { Category } from '@/features/categories/types'
import type { TransactionType, RecurrenceFrequency } from '@prisma/client'
import {
  transactionTypeSchema,
  recurrenceFrequencySchema,
} from '@/lib/validations/schemas'

const schema = z.object({
  categoryId: z.string().min(1, 'Required'),
  type: transactionTypeSchema,
  amount: z.coerce.number().positive('Must be greater than 0'),
  currency: z.string().min(3).max(3),
  frequency: recurrenceFrequencySchema,
  startDate: z.string().min(1, 'Required'),
  note: z.string().max(280).optional(),
})
// z.coerce.number() input type (unknown) differs from its output type (number); split accordingly.
type FormValues = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

function defaultValuesFor(rule?: RecurringTransactionWithCategory): FormValues {
  return {
    categoryId: rule?.categoryId ?? '',
    type: rule?.type ?? 'EXPENSE',
    amount: rule ? Number(rule.amount) : 0,
    currency: rule?.currency ?? 'USD',
    frequency: rule?.frequency ?? 'MONTHLY',
    // Left blank for "new" (not `new Date()`): evaluating current time during prerender fails `next build` under Cache Components.
    startDate: rule ? rule.nextRunDate.toString().slice(0, 10) : '',
    note: rule?.note ?? '',
  }
}

export function RecurringTransactionFormDialog({
  rule,
  trigger,
}: {
  rule?: RecurringTransactionWithCategory
  trigger: React.ReactElement
}) {
  const t = useTranslations('RecurringTransactions')
  const tTransactions = useTranslations('Transactions')
  const tCategories = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { data: categories } = useCategories()
  const { create, update } = useRecurringTransactionMutations()
  const [open, setOpen] = useState(false)
  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(rule),
  })

  function handleOpenChange(next: boolean) {
    // react-hook-form only reads defaultValues once at mount, so re-sync on every open.
    if (next) {
      const values = defaultValuesFor(rule)
      form.reset(
        rule
          ? values
          : { ...values, startDate: new Date().toISOString().slice(0, 10) },
      )
    }
    setOpen(next)
  }

  async function onSubmit(values: FormOutput) {
    if (rule) {
      await update.mutateAsync({ id: rule.id, ...values })
    } else {
      await create.mutateAsync(values)
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? t('edit') : t('new')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Controlled, not defaultValue: form.reset() would otherwise trigger Base UI's uncontrolled-Select warning. */}
          <Select
            value={form.watch('type')}
            onValueChange={(v) => form.setValue('type', v as TransactionType)}
          >
            <SelectTrigger>
              {/* SelectValue renders the raw value by default; map it to a translated label. */}
              <SelectValue>
                {(value: string | null) =>
                  value === 'EXPENSE'
                    ? tCategories('typeExpense')
                    : tCategories('typeIncome')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">
                {tCategories('typeExpense')}
              </SelectItem>
              <SelectItem value="INCOME">
                {tCategories('typeIncome')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={form.watch('categoryId')}
            onValueChange={(v) => form.setValue('categoryId', v ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder={tTransactions('categoryPlaceholder')}>
                {(value: string | null) =>
                  (categories as Category[] | undefined)?.find(
                    (c) => c.id === value,
                  )?.name ?? tTransactions('categoryPlaceholder')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(categories as Category[] | undefined)?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.01"
            placeholder={tTransactions('amount')}
            {...form.register('amount')}
          />
          <Input
            placeholder={tTransactions('currency')}
            maxLength={3}
            {...form.register('currency')}
          />
          <Select
            value={form.watch('frequency')}
            onValueChange={(v) =>
              form.setValue('frequency', v as RecurrenceFrequency)
            }
          >
            <SelectTrigger>
              <SelectValue>
                {(value: string | null) =>
                  value === 'WEEKLY'
                    ? t('frequencyWeekly')
                    : value === 'YEARLY'
                      ? t('frequencyYearly')
                      : t('frequencyMonthly')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">{t('frequencyWeekly')}</SelectItem>
              <SelectItem value="MONTHLY">{t('frequencyMonthly')}</SelectItem>
              <SelectItem value="YEARLY">{t('frequencyYearly')}</SelectItem>
            </SelectContent>
          </Select>
          {!rule && (
            <Input
              type="date"
              placeholder={t('startDate')}
              {...form.register('startDate')}
            />
          )}
          <Input
            placeholder={tTransactions('note')}
            {...form.register('note')}
          />
          <DialogFooter>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
