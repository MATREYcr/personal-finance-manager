import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BaseCurrencyForm } from '@/features/settings/components/BaseCurrencyForm'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // Required per-segment: the root layout's setRequestLocale isn't enough —
  // without this, Cache Components treats getTranslations as accessing
  // blocking runtime data and `npm run build` fails outright.
  setRequestLocale(locale)
  const t = await getTranslations('Settings')
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <BaseCurrencyForm />
    </div>
  )
}
