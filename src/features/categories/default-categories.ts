import { TransactionType } from '@prisma/client'

export const DEFAULT_CATEGORIES: Array<{
  name: string
  type: TransactionType
}> = [
  { name: 'Market', type: TransactionType.EXPENSE },
  { name: 'Transport', type: TransactionType.EXPENSE },
  { name: 'Rent', type: TransactionType.EXPENSE },
  { name: 'Utilities', type: TransactionType.EXPENSE },
  { name: 'Entertainment', type: TransactionType.EXPENSE },
  { name: 'Health', type: TransactionType.EXPENSE },
  { name: 'Other', type: TransactionType.EXPENSE },
  { name: 'Salary', type: TransactionType.INCOME },
  { name: 'Other Income', type: TransactionType.INCOME },
]
