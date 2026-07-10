import type { RecurringTransaction, Category } from '@prisma/client'

// `amount` is `number`: the RSC serializer rejects Prisma's `Decimal`, so queries.ts coerces it.
export type RecurringTransactionWithCategory = Omit<
  RecurringTransaction,
  'amount'
> & {
  amount: number
  category: Category
}
