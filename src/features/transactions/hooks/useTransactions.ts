'use client'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { TransactionFilters, PaginatedTransactions } from '../types'

export function useTransactions(filters: TransactionFilters, page: number) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters as Record<string, string | undefined>, page),
    queryFn: async (): Promise<PaginatedTransactions> => {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][]
      )
      params.set('page', String(page))
      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load transactions')
      return res.json()
    },
  })
}
