'use server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

const currencySchema = z.string().length(3)

export async function updateBaseCurrency(currency: string) {
  const session = await requireSession()
  const normalized = currencySchema.parse(currency).toUpperCase()

  await db.user.update({
    where: { id: session.user.id },
    data: { baseCurrency: normalized },
  })
}
