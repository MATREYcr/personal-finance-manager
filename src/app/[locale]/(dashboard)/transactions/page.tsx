import { getTranslations, setRequestLocale } from 'next-intl/server'
import { TransactionList } from '@/features/transactions/components/TransactionList'

export default async function TransactionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Transactions')
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-2xl font-semibold">{t('title')}</h1>
      <TransactionList />
    </div>
  )
}
