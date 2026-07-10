import { redirect } from '@/i18n/navigation'
import { ROUTES } from '@/lib/constants/routes'

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: ROUTES.DASHBOARD, locale })
}
