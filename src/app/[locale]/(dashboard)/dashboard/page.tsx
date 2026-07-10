import { Suspense } from 'react'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { ROUTES } from '@/lib/constants/routes'
import { getDashboardSummary } from '@/features/dashboard/queries'
import { PeriodSwitcher } from '@/features/dashboard/components/PeriodSwitcher'
import { SummaryCards } from '@/features/dashboard/components/SummaryCards'
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton'
import type { Period } from '@/features/dashboard/types'

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
    redirect({ href: ROUTES.SIGN_IN, locale })
    return
  }

  const { period: rawPeriod } = await searchParams
  const period: Period =
    rawPeriod === 'week' || rawPeriod === 'year' ? rawPeriod : 'month'
  const baseCurrency = (session.user as { baseCurrency: string }).baseCurrency

  const summary = await getDashboardSummary(
    session.user.id,
    period,
    baseCurrency,
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PeriodSwitcher period={period} />
      <SummaryCards summary={summary} baseCurrency={baseCurrency} />
    </div>
  )
}
