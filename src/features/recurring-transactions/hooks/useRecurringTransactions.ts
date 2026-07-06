'use client'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { RecurringTransactionWithCategory } from '../types'

export function useRecurringTransactions() {
  return useQuery({
    queryKey: queryKeys.recurringTransactions.all,
    queryFn: async (): Promise<RecurringTransactionWithCategory[]> => {
      const res = await fetch('/api/recurring-transactions')
      if (!res.ok) throw new Error('Failed to load recurring transactions')
      return res.json()
    },
  })
}
