import type { PrismaClient } from '@prisma/client'
import { DEFAULT_CATEGORIES } from './default-categories'

export async function seedDefaultCategories(db: PrismaClient, userId: string) {
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
  })
}
