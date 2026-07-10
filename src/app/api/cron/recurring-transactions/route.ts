import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { generateDueRecurringTransactions } from '@/features/recurring-transactions/generate'
import { CACHE_TAGS } from '@/lib/constants/cache-tags'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await generateDueRecurringTransactions(db)
  if (result.generated > 0) {
    // Bypasses actions.ts, so it must invalidate the same tags here.
    revalidateTag(CACHE_TAGS.TRANSACTIONS, { expire: 0 })
    revalidateTag(CACHE_TAGS.RECURRING_TRANSACTIONS, { expire: 0 })
  }
  return Response.json(result)
}
