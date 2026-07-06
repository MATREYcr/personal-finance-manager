'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import type { Category } from '../types'

const schema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['EXPENSE', 'INCOME']),
})
type FormValues = z.infer<typeof schema>

export function CategoryFormDialog({ category, trigger }: { category?: Category; trigger: React.ReactElement }) {
  const t = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { create, update } = useCategoryMutations()
  const [open, setOpen] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? '', type: category?.type ?? 'EXPENSE' },
  })

  function handleOpenChange(next: boolean) {
    // Re-sync the form to the category's current values (or a blank slate for
    // "new") every time the dialog opens — react-hook-form's defaultValues is
    // only read once at mount, so without this a persistent row instance would
    // keep showing the values from the first time it was ever opened.
    if (next) form.reset({ name: category?.name ?? '', type: category?.type ?? 'EXPENSE' })
    setOpen(next)
  }

  async function onSubmit(values: FormValues) {
    if (category) {
      await update.mutateAsync({ id: category.id, ...values })
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
          <DialogTitle>{category ? t('editCategory') : t('newCategory')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input placeholder={t('name')} {...form.register('name')} />
          <Select
            defaultValue={form.getValues('type')}
            onValueChange={(v) => form.setValue('type', v as 'EXPENSE' | 'INCOME')}
          >
            <SelectTrigger>
              <SelectValue>
                {(value: 'EXPENSE' | 'INCOME') => (value === 'EXPENSE' ? t('typeExpense') : t('typeIncome'))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">{t('typeExpense')}</SelectItem>
              <SelectItem value="INCOME">{t('typeIncome')}</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
