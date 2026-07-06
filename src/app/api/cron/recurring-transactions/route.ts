import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { generateDueRecurringTransactions } from '@/features/recurring-transactions/generate'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await generateDueRecurringTransactions(db)
  if (result.generated > 0) {
    // This path creates Transaction rows and advances nextRunDate outside of
    // actions.ts, so it must invalidate the same tags actions.ts would have.
    // revalidateTag (not updateTag, which throws outside a Server Action)
    // now requires a profile argument; { expire: 0 } forces immediate
    // expiration, matching updateTag's immediacy as closely as this API
    // allows for a route hit by an external cron trigger.
    revalidateTag('transactions', { expire: 0 })
    revalidateTag('recurring-transactions', { expire: 0 })
  }
  return Response.json(result)
}
