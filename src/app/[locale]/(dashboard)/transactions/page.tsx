import { getTranslations, setRequestLocale } from 'next-intl/server'
import { TransactionList } from '@/features/transactions/components/TransactionList'

export default async function TransactionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // Required per-segment: the root layout's setRequestLocale isn't enough —
  // without this, Cache Components treats getTranslations as accessing
  // blocking runtime data and `npm run build` fails outright.
  setRequestLocale(locale)
  const t = await getTranslations('Transactions')
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <TransactionList />
    </div>
  )
}
