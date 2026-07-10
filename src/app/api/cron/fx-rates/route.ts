import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { refreshExchangeRates } from '@/features/exchange-rates/fetch-rates'
import { CACHE_TAGS } from '@/lib/constants/cache-tags'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await refreshExchangeRates(db)
  if (result.updated > 0) {
    // Next 16 requires this second arg for revalidateTag; { expire: 0 } is the pattern for external cron triggers.
    revalidateTag(CACHE_TAGS.EXCHANGE_RATES, { expire: 0 })
  }
  return Response.json(result)
}
