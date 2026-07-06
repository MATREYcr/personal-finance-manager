import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CategoryList } from '@/features/categories/components/CategoryList'

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // Enable static rendering for this page: next-intl's server APIs require the
  // request locale to be set per-segment (the root layout setting it isn't
  // enough), otherwise Next.js's Cache Components treats getTranslations as
  // accessing blocking runtime data and the production build fails.
  setRequestLocale(locale)
  const t = await getTranslations('Categories')
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <CategoryList />
    </div>
  )
}
