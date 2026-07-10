import type { Transaction, Category, TransactionType } from '@prisma/client'

// `amount` is `number`, not Prisma's `Decimal`: queries.ts coerces it since the RSC serializer rejects Decimal.
export type TransactionWithCategory = Omit<Transaction, 'amount'> & {
  amount: number
  category: Category
}

export interface TransactionFilters {
  categoryId?: string
  type?: TransactionType
  from?: string // ISO date
  to?: string // ISO date
}

export interface PaginatedTransactions {
  transactions: TransactionWithCategory[]
  totalCount: number
  page: number
  pageSize: number
}
