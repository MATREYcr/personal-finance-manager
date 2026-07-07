import type { Transaction, Category } from '@prisma/client'

// `amount` is `number`, not Prisma's `Decimal`: this row always crosses a
// serialization boundary before any consumer sees it (the '/api/transactions'
// JSON response, and the `'use cache'` serializer in queries.ts), and the RSC
// serializer rejects Decimal instances outright. queries.ts coerces it with
// Number() so the type reflects the real runtime shape.
export type TransactionWithCategory = Omit<Transaction, 'amount'> & {
  amount: number
  category: Category
}

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
