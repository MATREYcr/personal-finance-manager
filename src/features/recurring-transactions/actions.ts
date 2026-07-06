'use server'
import { z } from 'zod'
import { updateTag } from 'next/cache'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

const recurringInputSchema = z.object({
  categoryId: z.string().min(1),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().min(1),
  note: z.string().max(280).optional(),
})

async function assertOwnsCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({ where: { id: categoryId, userId } })
  if (!category) throw new Error('That category does not exist for this user')
}

// Server Actions serialize their return value to send back to the client
// (React's Flight protocol), which only supports plain objects — Prisma's
// `amount` field comes back as a `Decimal` class instance, and passing that
// straight through throws "Only plain objects can be passed to Client
// Components from Server Components. Decimal objects are not supported." the
// moment a mutation resolves in the browser. Coerce it to a plain number.
// Same fix as Transactions' actions.ts.
function toPlainRule<T extends { amount: unknown }>(rule: T) {
  return { ...rule, amount: Number(rule.amount) }
}

// Note: the category-ownership error below is a defensive/should-never-happen
// case (the UI only ever offers the current user's own categories in the
// select), not a user-facing validation message, so it is intentionally not
// translated — same rationale as the Transactions plan's identical check.
export async function createRecurringTransaction(input: z.infer<typeof recurringInputSchema>) {
  const session = await requireSession()
  const { categoryId, type, amount, currency, frequency, startDate, note } = recurringInputSchema.parse(input)

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

  updateTag('recurring-transactions')
  return toPlainRule(rule)
}

const updateRecurringInputSchema = recurringInputSchema.extend({ id: z.string().min(1) })

export async function updateRecurringTransaction(input: z.infer<typeof updateRecurringInputSchema>) {
  const session = await requireSession()
  const { id, categoryId, type, amount, currency, frequency, note } = updateRecurringInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  // Intentionally does not touch nextRunDate — editing a rule must never
  // retroactively affect already-generated transactions or skip/duplicate the next run.
  const rule = await db.recurringTransaction.update({
    where: { id, userId: session.user.id },
    data: { categoryId, type, amount, currency, frequency, note },
  })

  updateTag('recurring-transactions')
  return toPlainRule(rule)
}

export async function setRecurringTransactionActive(rawId: string, active: boolean) {
  const session = await requireSession()
  const id = z.string().min(1).parse(rawId)
  const rule = await db.recurringTransaction.update({
    where: { id, userId: session.user.id },
    data: { active },
  })
  updateTag('recurring-transactions')
  return toPlainRule(rule)
}

export async function deleteRecurringTransaction(rawId: string) {
  const session = await requireSession()
  const id = z.string().min(1).parse(rawId)
  await db.recurringTransaction.delete({ where: { id, userId: session.user.id } })
  updateTag('recurring-transactions')
}
