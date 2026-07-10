'use server'
import { z } from 'zod'
import { updateTag } from 'next/cache'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { CACHE_TAGS } from '@/lib/constants/cache-tags'
import {
  transactionTypeSchema,
  recurrenceFrequencySchema,
} from '@/lib/validations/schemas'

const recurringInputSchema = z.object({
  categoryId: z.string().min(1),
  type: transactionTypeSchema,
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  frequency: recurrenceFrequencySchema,
  startDate: z.string().min(1),
  note: z.string().max(280).optional(),
})

async function assertOwnsCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId },
  })
  if (!category) throw new Error('That category does not exist for this user')
}

// React's Flight protocol can't serialize Prisma's Decimal, so coerce to a plain number.
function toPlainRule<T extends { amount: unknown }>(rule: T) {
  return { ...rule, amount: Number(rule.amount) }
}

// Defensive should-never-happen check (UI only offers the user's own categories), left untranslated.
export async function createRecurringTransaction(
  input: z.infer<typeof recurringInputSchema>,
) {
  const session = await requireSession()
  const { categoryId, type, amount, currency, frequency, startDate, note } =
    recurringInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  const rule = await db.recurringTransaction.create({
    data: {
      userId: session.user.id,
      categoryId,
      type,
      amount,
      currency,
      frequency,
      nextRunDate: new Date(startDate),
      note,
      active: true,
    },
  })

  updateTag(CACHE_TAGS.RECURRING_TRANSACTIONS)
  return toPlainRule(rule)
}

const updateRecurringInputSchema = recurringInputSchema.extend({
  id: z.string().min(1),
})

export async function updateRecurringTransaction(
  input: z.infer<typeof updateRecurringInputSchema>,
) {
  const session = await requireSession()
  const { id, categoryId, type, amount, currency, frequency, note } =
    updateRecurringInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  // Intentionally does not touch nextRunDate, to avoid skipping/duplicating the next run.
  const rule = await db.recurringTransaction.update({
    where: { id, userId: session.user.id },
    data: { categoryId, type, amount, currency, frequency, note },
  })

  updateTag(CACHE_TAGS.RECURRING_TRANSACTIONS)
  return toPlainRule(rule)
}

const setActiveInputSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
})

export async function setRecurringTransactionActive(
  rawId: string,
  rawActive: boolean,
) {
  const session = await requireSession()
  const { id, active } = setActiveInputSchema.parse({
    id: rawId,
    active: rawActive,
  })
  const rule = await db.recurringTransaction.update({
    where: { id, userId: session.user.id },
    data: { active },
  })
  updateTag(CACHE_TAGS.RECURRING_TRANSACTIONS)
  return toPlainRule(rule)
}

export async function deleteRecurringTransaction(rawId: string) {
  const session = await requireSession()
  const id = z.string().min(1).parse(rawId)
  await db.recurringTransaction.delete({
    where: { id, userId: session.user.id },
  })
  updateTag(CACHE_TAGS.RECURRING_TRANSACTIONS)
}
