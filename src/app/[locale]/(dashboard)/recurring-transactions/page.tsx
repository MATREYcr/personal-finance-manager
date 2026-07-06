import { getTranslations, setRequestLocale } from 'next-intl/server'
import { RecurringTransactionList } from '@/features/recurring-transactions/components/RecurringTransactionList'

export default async function RecurringTransactionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // Required per-segment: the root layout's setRequestLocale isn't enough —
  // without this, Cache Components treats getTranslations as accessing
  // blocking runtime data and `npm run build` fails outright.
  setRequestLocale(locale)
  const t = await getTranslations('RecurringTransactions')
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <RecurringTransactionList />
    </div>
  )
}
