import type { Transaction, Category } from '@prisma/client'

export type TransactionWithCategory = Transaction & { category: Category }

export interface TransactionFilters {
  categoryId?: string
  type?: 'EXPENSE' | 'INCOME'
  from?: string // ISO date
  to?: string // ISO date
}

export interface PaginatedTransactions {
  transactions: TransactionWithCategory[]
  totalCount: number
  page: number
  pageSize: number
}
