import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CategoryList } from '@/features/categories/components/CategoryList'

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Categories')
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-2xl font-semibold">{t('title')}</h1>
      <CategoryList />
    </div>
  )
}
