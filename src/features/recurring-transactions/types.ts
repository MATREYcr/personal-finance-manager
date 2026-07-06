import type { RecurringTransaction, Category } from '@prisma/client'

// `amount` is `number`, not Prisma's `Decimal`: this row always crosses a
// serialization boundary before any consumer sees it (the
// '/api/recurring-transactions' JSON response, and the `'use cache'` serializer
// in queries.ts), and the RSC serializer rejects Decimal instances. queries.ts
// coerces it with Number() so the type reflects the real runtime shape.
export type RecurringTransactionWithCategory = Omit<RecurringTransaction, 'amount'> & {
  amount: number
  category: Category
}
