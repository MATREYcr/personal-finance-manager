'use client'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useCategories } from '@/features/categories/hooks/useCategories'
import type { TransactionFilters as Filters } from '../types'
import type { Category } from '@/features/categories/types'
import type { TransactionType } from '@prisma/client'

export function TransactionFilters({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (next: Filters) => void
}) {
  const t = useTranslations('Transactions')
  const tCategories = useTranslations('Categories')
  const { data: categories } = useCategories()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Select
        value={filters.type ?? 'ALL'}
        onValueChange={(v) =>
          onChange({
            ...filters,
            type: v === 'ALL' ? undefined : (v as TransactionType),
          })
        }
      >
        <SelectTrigger className="w-full sm:w-40">
          {/* base-ui's SelectValue renders the raw value by default; map it to a translated label here. */}
          <SelectValue placeholder={t('filterAllTypes')}>
            {(value: string | null) =>
              value === 'EXPENSE'
                ? tCategories('typeExpense')
                : value === 'INCOME'
                  ? tCategories('typeIncome')
                  : t('filterAllTypes')
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t('filterAllTypes')}</SelectItem>
          <SelectItem value="EXPENSE">{tCategories('typeExpense')}</SelectItem>
          <SelectItem value="INCOME">{tCategories('typeIncome')}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.categoryId ?? 'ALL'}
        onValueChange={(v) =>
          onChange({
            ...filters,
            categoryId: !v || v === 'ALL' ? undefined : v,
          })
        }
      >
        <SelectTrigger className="w-full sm:w-48">
          {/* Without this callback, the trigger would show the raw category id instead of its name. */}
          <SelectValue placeholder={t('filterAllCategories')}>
            {(value: string | null) =>
              !value || value === 'ALL'
                ? t('filterAllCategories')
                : ((categories as Category[] | undefined)?.find(
                    (c) => c.id === value,
                  )?.name ?? value)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t('filterAllCategories')}</SelectItem>
          {(categories as Category[] | undefined)?.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-full sm:w-40"
        value={filters.from ?? ''}
        onChange={(e) =>
          onChange({ ...filters, from: e.target.value || undefined })
        }
      />
      <Input
        type="date"
        className="w-full sm:w-40"
        value={filters.to ?? ''}
        onChange={(e) =>
          onChange({ ...filters, to: e.target.value || undefined })
        }
      />
    </div>
  )
}
