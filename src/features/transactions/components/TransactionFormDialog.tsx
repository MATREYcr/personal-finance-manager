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
import { useTransactionMutations } from '../hooks/useTransactionMutations'
import type { TransactionWithCategory } from '../types'
import type { Category } from '@/features/categories/types'
import type { TransactionType } from '@prisma/client'
import { transactionTypeSchema } from '@/lib/validations/schemas'

const schema = z.object({
  categoryId: z.string().min(1, 'Required'),
  type: transactionTypeSchema,
  amount: z.coerce.number().positive('Must be greater than 0'),
  currency: z.string().min(3).max(3),
  date: z.string().min(1, 'Required'),
  note: z.string().max(280).optional(),
})
// Split input/output types: z.coerce.number() takes unknown but outputs number.
type FormValues = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

function defaultValuesFor(transaction?: TransactionWithCategory): FormValues {
  return {
    categoryId: transaction?.categoryId ?? '',
    type: transaction?.type ?? 'EXPENSE',
    amount: transaction ? Number(transaction.amount) : 0,
    currency: transaction?.currency ?? 'USD',
    // Left blank for "new" (not `new Date()`): reading current time during prerender fails `next build`.
    date: transaction ? transaction.date.toString().slice(0, 10) : '',
    note: transaction?.note ?? '',
  }
}

export function TransactionFormDialog({
  transaction,
  trigger,
}: {
  transaction?: TransactionWithCategory
  trigger: React.ReactElement
}) {
  const t = useTranslations('Transactions')
  const tCategories = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { data: categories } = useCategories()
  const { create, update } = useTransactionMutations()
  const [open, setOpen] = useState(false)
  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(transaction),
  })

  function handleOpenChange(next: boolean) {
    // Re-sync on open: react-hook-form's defaultValues is only read once at mount.
    if (next) {
      const values = defaultValuesFor(transaction)
      form.reset(
        transaction
          ? values
          : { ...values, date: new Date().toISOString().slice(0, 10) },
      )
    }
    setOpen(next)
  }

  async function onSubmit(values: FormOutput) {
    if (transaction) {
      await update.mutateAsync({ id: transaction.id, ...values })
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
          <DialogTitle>
            {transaction ? t('editTransaction') : t('newTransaction')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Select
            // Controlled (not defaultValue): form.reset() would otherwise trigger Base UI's uncontrolled-Select warning.
            value={form.watch('type')}
            onValueChange={(v) => form.setValue('type', v as TransactionType)}
          >
            <SelectTrigger>
              {/* base-ui's SelectValue renders the raw value by default; map it to a translated label here. */}
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
              {/* Without this callback, the trigger would show the raw category id instead of its name. */}
              <SelectValue placeholder={t('categoryPlaceholder')}>
                {(value: string | null) =>
                  (categories as Category[] | undefined)?.find(
                    (c) => c.id === value,
                  )?.name ?? t('categoryPlaceholder')
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
            placeholder={t('amount')}
            {...form.register('amount')}
          />
          <Input
            placeholder={t('currency')}
            maxLength={3}
            {...form.register('currency')}
          />
          <Input type="date" {...form.register('date')} />
          <Input placeholder={t('note')} {...form.register('note')} />
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
