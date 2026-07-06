'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useTransactionMutations } from '../hooks/useTransactionMutations'
import type { TransactionWithCategory } from '../types'
import type { Category } from '@/features/categories/types'

const schema = z.object({
  categoryId: z.string().min(1, 'Required'),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.coerce.number().positive('Must be greater than 0'),
  currency: z.string().min(3).max(3),
  date: z.string().min(1, 'Required'),
  note: z.string().max(280).optional(),
})
// z.coerce.number() has a different input type (unknown, since it accepts
// anything coercible) than output type (number, post-coercion) — split the
// two so useForm's default values (input) and submit handler (output) each
// get the type they actually deal with.
type FormValues = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

function defaultValuesFor(transaction?: TransactionWithCategory): FormValues {
  return {
    categoryId: transaction?.categoryId ?? '',
    type: transaction?.type ?? 'EXPENSE',
    amount: transaction ? Number(transaction.amount) : 0,
    currency: transaction?.currency ?? 'USD',
    // Left blank for "new" here (rather than `new Date()`) since this runs on
    // every render, including the initial prerender of this Client Component
    // before the dialog is ever opened — evaluating the current time there
    // trips Cache Components' "used inside a Client Component without a
    // Suspense boundary" check (next-prerender-current-time-client) and fails
    // `next build`. Today's date is filled in instead in handleOpenChange,
    // which only runs client-side in response to the user opening the dialog.
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
    // Re-sync the form to this row's current values (or a blank slate for
    // "new") every time the dialog opens — react-hook-form's defaultValues is
    // only read once at mount, so without this a persistent row instance
    // would keep showing whatever it first opened with. Same fix as
    // Categories' CategoryFormDialog. For a new transaction, also fill in
    // today's date here (see defaultValuesFor) since this only runs
    // client-side, after the user opens the dialog.
    if (next) {
      const values = defaultValuesFor(transaction)
      form.reset(transaction ? values : { ...values, date: new Date().toISOString().slice(0, 10) })
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
          <DialogTitle>{transaction ? t('editTransaction') : t('newTransaction')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Select
            // Controlled (value, not defaultValue) on purpose: `form.reset()`
            // (see handleOpenChange) changes this field's value after mount,
            // and an uncontrolled Select fed a fresh `defaultValue` on every
            // render logs Base UI's "changing the default value state of an
            // uncontrolled Select after being initialized" warning. `watch`
            // keeps this in sync with react-hook-form's state across resets.
            value={form.watch('type')}
            onValueChange={(v) => form.setValue('type', v as 'EXPENSE' | 'INCOME')}
          >
            <SelectTrigger>
              {/* base-ui's SelectValue renders the raw value by default — a
                  children render-callback is required to map it to a
                  translated label, same fix as Categories' CategoryFormDialog. */}
              <SelectValue>
                {(value: string | null) => (value === 'EXPENSE' ? tCategories('typeExpense') : tCategories('typeIncome'))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">{tCategories('typeExpense')}</SelectItem>
              <SelectItem value="INCOME">{tCategories('typeIncome')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            // Same controlled-Select fix as the type select above.
            value={form.watch('categoryId')}
            onValueChange={(v) => form.setValue('categoryId', v ?? '')}
          >
            <SelectTrigger>
              {/* Same default-raw-value issue as the type select above, but
                  here the raw value is a category id — without this callback
                  the trigger would literally show the category's id string. */}
              <SelectValue placeholder={t('categoryPlaceholder')}>
                {(value: string | null) =>
                  (categories as Category[] | undefined)?.find((c) => c.id === value)?.name ?? t('categoryPlaceholder')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(categories as Category[] | undefined)?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" placeholder={t('amount')} {...form.register('amount')} />
          <Input placeholder={t('currency')} maxLength={3} {...form.register('currency')} />
          <Input type="date" {...form.register('date')} />
          <Input placeholder={t('note')} {...form.register('note')} />
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || update.isPending}>{tCommon('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
