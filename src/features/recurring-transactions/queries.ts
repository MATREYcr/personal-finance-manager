'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getRecurringTransactions(userId: string) {
  cacheTag('recurring-transactions')
  const rules = await db.recurringTransaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { nextRunDate: 'asc' },
  })

  // Coerce Decimal -> number before returning: this is a `'use cache'` function,
  // and the RSC serializer that caches its return value throws on Prisma Decimal
  // instances. Every consumer already treats amount as a number.
  return rules.map((rule) => ({ ...rule, amount: Number(rule.amount) }))
}
