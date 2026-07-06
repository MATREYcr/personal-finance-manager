'use server'
import { z } from 'zod'
import { updateTag } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

const categoryInputSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['EXPENSE', 'INCOME']),
})

export async function createCategory(input: z.infer<typeof categoryInputSchema>) {
  const session = await requireSession()
  const { name, type } = categoryInputSchema.parse(input)

  const category = await db.category.create({
    data: { userId: session.user.id, name, type },
  })

  updateTag('categories')
  return category
}

const updateCategoryInputSchema = categoryInputSchema.extend({
  id: z.string().min(1),
})

export async function updateCategory(input: z.infer<typeof updateCategoryInputSchema>) {
  const session = await requireSession()
  const { id, name, type } = updateCategoryInputSchema.parse(input)

  const category = await db.category.update({
    where: { id, userId: session.user.id },
    data: { name, type },
  })

  updateTag('categories')
  return category
}

export async function deleteCategory(categoryId: string): Promise<{ blocked: boolean; message?: string }> {
  const session = await requireSession()
  const id = z.string().min(1).parse(categoryId)

  const [transactionCount, recurringCount] = await Promise.all([
    db.transaction.count({ where: { categoryId: id, userId: session.user.id } }),
    db.recurringTransaction.count({ where: { categoryId: id, userId: session.user.id } }),
  ])

  if (transactionCount > 0 || recurringCount > 0) {
    // Returned, not thrown: Next.js redacts thrown Server Action errors to a
    // generic message in production (the docs recommend return values for
    // exactly this "expected error" case), so throwing here would silently
    // swallow this translated message before it ever reaches the client.
    const t = await getTranslations('Categories')
    return { blocked: true, message: t('deleteError') }
  }

  await db.category.delete({ where: { id, userId: session.user.id } })
  updateTag('categories')
  return { blocked: false }
}
