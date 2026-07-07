'use server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

// Exactly three ASCII letters (an ISO-4217-shaped code), not just any 3-char
// string — length alone would accept "1$X" and persist it as a "currency".
const currencySchema = z.string().regex(/^[A-Za-z]{3}$/)

export async function updateBaseCurrency(currency: string) {
  const session = await requireSession()
  const normalized = currencySchema.parse(currency).toUpperCase()

  await db.user.update({
    where: { id: session.user.id },
    data: { baseCurrency: normalized },
  })
}
