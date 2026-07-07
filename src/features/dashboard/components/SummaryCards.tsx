import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { DashboardSummary } from '../types'

export function SummaryCards({ summary, baseCurrency }: { summary: DashboardSummary; baseCurrency: string }) {
  const t = useTranslations('Dashboard')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>{t('income')}</CardTitle></CardHeader>
        <CardContent className="tabular-nums text-2xl font-semibold text-(--positive)">
          {summary.income.toFixed(2)} {baseCurrency}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('expense')}</CardTitle></CardHeader>
        <CardContent className="tabular-nums text-2xl font-semibold text-destructive">
          {summary.expense.toFixed(2)} {baseCurrency}
        </CardContent>
      </Card>
      {/* Savings gets a subtle accent-tinted border per the mockup, distinguishing it as the headline figure */}
      <Card className="border-primary/30">
        <CardHeader><CardTitle>{t('savings')}</CardTitle></CardHeader>
        <CardContent
          className={`tabular-nums text-2xl font-semibold ${
            summary.savings >= 0 ? 'text-(--positive)' : 'text-destructive'
          }`}
        >
          {summary.savings.toFixed(2)} {baseCurrency}
        </CardContent>
      </Card>
    </div>
  )
}
