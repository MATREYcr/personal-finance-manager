'use server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

// Must be 3 ASCII letters, not just any 3-char string, e.g. "1$X" would pass a length-only check.
const currencySchema = z.string().regex(/^[A-Za-z]{3}$/)

export async function updateBaseCurrency(currency: string) {
  const session = await requireSession()
  const normalized = currencySchema.parse(currency).toUpperCase()

  await db.user.update({
    where: { id: session.user.id },
    data: { baseCurrency: normalized },
  })
}
