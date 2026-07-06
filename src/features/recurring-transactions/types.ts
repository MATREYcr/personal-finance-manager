import type { RecurringTransaction, Category } from '@prisma/client'

export type RecurringTransactionWithCategory = RecurringTransaction & { category: Category }
