'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { CACHE_TAGS } from '@/lib/constants/cache-tags'

export async function getRecurringTransactions(userId: string) {
  cacheTag(CACHE_TAGS.RECURRING_TRANSACTIONS)
  const rules = await db.recurringTransaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { nextRunDate: 'asc' },
  })

  // 'use cache' serializer throws on Prisma Decimal instances, so coerce to number.
  return rules.map((rule) => ({ ...rule, amount: Number(rule.amount) }))
}
