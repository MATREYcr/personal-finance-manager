import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { refreshExchangeRates } from '@/features/exchange-rates/fetch-rates'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await refreshExchangeRates(db)
  if (result.updated > 0) {
    // revalidateTag (not updateTag — this is a Route Handler, not a Server
    // Action) requires a second argument in Next 16; the single-arg form is
    // deprecated and type-errors. `{ expire: 0 }` is the documented pattern for
    // external cron/webhook triggers that need fresh data on the next request.
    revalidateTag('exchange-rates', { expire: 0 })
  }
  return Response.json(result)
}
