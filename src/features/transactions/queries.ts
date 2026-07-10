'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { CACHE_TAGS } from '@/lib/constants/cache-tags'
import { getPaginationParams } from './pagination'
import type { TransactionFilters, PaginatedTransactions } from './types'

export async function getTransactions(
  userId: string,
  filters: TransactionFilters = {},
  page: number = 1,
): Promise<PaginatedTransactions> {
  cacheTag(CACHE_TAGS.TRANSACTIONS)

  const where = {
    userId,
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
  }

  const { skip, take } = getPaginationParams(page)

  const [transactions, totalCount] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    db.transaction.count({ where }),
  ])

  // Coerce Decimal -> number: the 'use cache' RSC serializer throws on Prisma Decimal instances.
  const plainTransactions = transactions.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
  }))

  return { transactions: plainTransactions, totalCount, page, pageSize: take }
}
