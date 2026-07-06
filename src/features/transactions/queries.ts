'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { getPaginationParams } from './pagination'
import type { TransactionFilters, PaginatedTransactions } from './types'

export async function getTransactions(
  userId: string,
  filters: TransactionFilters = {},
  page: number = 1
): Promise<PaginatedTransactions> {
  cacheTag('transactions')

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

  return { transactions, totalCount, page, pageSize: take }
}
