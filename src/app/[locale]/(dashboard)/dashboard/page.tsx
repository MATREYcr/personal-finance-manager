import { Suspense } from 'react'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { getDashboardSummary } from '@/features/dashboard/queries'
import { PeriodSwitcher } from '@/features/dashboard/components/PeriodSwitcher'
import { SummaryCards } from '@/features/dashboard/components/SummaryCards'
import type { Period } from '@/features/dashboard/types'

// Cache Components (next.config.ts `cacheComponents: true`) errors at build time
// ("Uncached data was accessed outside of <Suspense>") if headers()/searchParams
// are read at the top of a page with no Suspense boundary. The fix (per Next's
// own "migrating to Cache Components" guide) is to keep the page itself
// synchronous and push all the runtime-data access into a component wrapped in
// <Suspense>, passing the params/searchParams promises straight through.
export default function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ period?: string }>
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function DashboardContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ period?: string }>
}) {
  const { locale } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    // next-intl's redirect() isn't typed `never`, so without this explicit
    // return TS can't narrow `session` for the rest of the function.
    redirect({ href: '/sign-in', locale })
    return
  }

  const { period: rawPeriod } = await searchParams
  const period: Period = rawPeriod === 'week' || rawPeriod === 'year' ? rawPeriod : 'month'
  const baseCurrency = (session.user as { baseCurrency: string }).baseCurrency

  const summary = await getDashboardSummary(session.user.id, period, baseCurrency)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PeriodSwitcher period={period} />
      <SummaryCards summary={summary} baseCurrency={baseCurrency} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}
