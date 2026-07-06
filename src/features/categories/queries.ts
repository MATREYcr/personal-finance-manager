'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getCategories(userId: string) {
  cacheTag('categories')
  return db.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  })
}
