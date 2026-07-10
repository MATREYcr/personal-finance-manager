'use client'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories } from '../hooks/useCategories'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import { CategoryFormDialog } from './CategoryFormDialog'

export function CategoryList() {
  const t = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { data: categories, isLoading } = useCategories()
  const { remove } = useCategoryMutations()

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
        <CategoryFormDialog trigger={<Button>{t('newCategory')}</Button>} />
      </div>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnName')}</TableHead>
              <TableHead>{t('columnType')}</TableHead>
              <TableHead className="text-right">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>
                  {category.type === 'EXPENSE'
                    ? t('typeExpense')
                    : t('typeIncome')}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <CategoryFormDialog
                    category={category}
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
                    onClick={() => remove.mutate(category.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {remove.isError && (
        <Alert variant="destructive">
          <AlertDescription>{(remove.error as Error).message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
