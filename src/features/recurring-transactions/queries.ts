'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getRecurringTransactions(userId: string) {
  cacheTag('recurring-transactions')
  return db.recurringTransaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { nextRunDate: 'asc' },
  })
}
