'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { CACHE_TAGS } from '@/lib/constants/cache-tags'

export async function getCategories(userId: string) {
  cacheTag(CACHE_TAGS.CATEGORIES)
  return db.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  })
}
