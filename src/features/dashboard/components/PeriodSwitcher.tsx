'use client'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Period } from '../types'

export function PeriodSwitcher({ period }: { period: Period }) {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Tabs
      value={period}
      onValueChange={(v) => router.push(`${pathname}?period=${v}`)}
    >
      <TabsList>
        <TabsTrigger value="week">{t('week')}</TabsTrigger>
        <TabsTrigger value="month">{t('month')}</TabsTrigger>
        <TabsTrigger value="year">{t('year')}</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
