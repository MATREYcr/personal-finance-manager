import { getTranslations, setRequestLocale } from 'next-intl/server'
import { RecurringTransactionList } from '@/features/recurring-transactions/components/RecurringTransactionList'

export default async function RecurringTransactionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('RecurringTransactions')
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-2xl font-semibold">{t('title')}</h1>
      <RecurringTransactionList />
    </div>
  )
}
