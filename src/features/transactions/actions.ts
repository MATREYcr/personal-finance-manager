'use server'
import { z } from 'zod'
import { updateTag } from 'next/cache'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { CACHE_TAGS } from '@/lib/constants/cache-tags'
import { transactionTypeSchema } from '@/lib/validations/schemas'

const transactionInputSchema = z.object({
  categoryId: z.string().min(1),
  type: transactionTypeSchema,
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  date: z.string().min(1),
  note: z.string().max(280).optional(),
})

async function assertOwnsCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId },
  })
  if (!category) throw new Error('That category does not exist for this user')
}

// Coerce Decimal -> number: React's Flight protocol can't serialize Prisma's Decimal instances.
function toPlainTransaction<T extends { amount: unknown }>(transaction: T) {
  return { ...transaction, amount: Number(transaction.amount) }
}

export async function createTransaction(
  input: z.infer<typeof transactionInputSchema>,
) {
  const session = await requireSession()
  const { categoryId, type, amount, currency, date, note } =
    transactionInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  const transaction = await db.transaction.create({
    data: {
      userId: session.user.id,
      categoryId,
      type,
      amount,
      currency,
      date: new Date(date),
      note,
    },
  })

  updateTag(CACHE_TAGS.TRANSACTIONS)
  return toPlainTransaction(transaction)
}

const updateTransactionInputSchema = transactionInputSchema.extend({
  id: z.string().min(1),
})

export async function updateTransaction(
  input: z.infer<typeof updateTransactionInputSchema>,
) {
  const session = await requireSession()
  const { id, categoryId, type, amount, currency, date, note } =
    updateTransactionInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  const transaction = await db.transaction.update({
    where: { id, userId: session.user.id },
    data: { categoryId, type, amount, currency, date: new Date(date), note },
  })

  updateTag(CACHE_TAGS.TRANSACTIONS)
  return toPlainTransaction(transaction)
}

export async function deleteTransaction(rawId: string) {
  const session = await requireSession()
  const id = z.string().min(1).parse(rawId)
  await db.transaction.delete({ where: { id, userId: session.user.id } })
  updateTag(CACHE_TAGS.TRANSACTIONS)
}
