import type { TransactionType } from '@prisma/client'

export const DEFAULT_CATEGORIES: Array<{ name: string; type: TransactionType }> = [
  { name: 'Market', type: 'EXPENSE' },
  { name: 'Transport', type: 'EXPENSE' },
  { name: 'Rent', type: 'EXPENSE' },
  { name: 'Utilities', type: 'EXPENSE' },
  { name: 'Entertainment', type: 'EXPENSE' },
  { name: 'Health', type: 'EXPENSE' },
  { name: 'Other', type: 'EXPENSE' },
  { name: 'Salary', type: 'INCOME' },
  { name: 'Other Income', type: 'INCOME' },
]
