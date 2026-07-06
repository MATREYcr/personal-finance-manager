import type { PrismaClient, RecurrenceFrequency } from '@prisma/client'

function advanceDate(date: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(date)
  if (frequency === 'WEEKLY') next.setDate(next.getDate() + 7)
  else if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1)
  else next.setFullYear(next.getFullYear() + 1)
  return next
}

export async function generateDueRecurringTransactions(
  db: PrismaClient,
  now: Date = new Date()
): Promise<{ generated: number }> {
  const dueRules = await db.recurringTransaction.findMany({
    where: { active: true, nextRunDate: { lte: now } },
  })

  let generated = 0
  for (const rule of dueRules) {
    // Atomic per rule: if the process dies mid-loop, a retry never
    // double-creates a transaction or skips advancing nextRunDate.
    await db.$transaction([
      db.transaction.create({
        data: {
          userId: rule.userId,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          date: rule.nextRunDate,
          note: rule.note,
          recurringId: rule.id,
        },
      }),
      db.recurringTransaction.update({
        where: { id: rule.id },
        data: { nextRunDate: advanceDate(rule.nextRunDate, rule.frequency) },
      }),
    ])
    generated++
  }

  return { generated }
}
