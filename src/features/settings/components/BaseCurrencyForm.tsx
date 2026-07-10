'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useSession } from '@/lib/auth/client'
import { updateBaseCurrency } from '../actions'

export function BaseCurrencyForm() {
  // Gate on loaded session: initializing useState before session resolves would pin baseCurrency to 'USD' forever.
  const { data: session, isPending } = useSession()
  if (isPending || !session) return null
  const initialCurrency =
    (session.user as { baseCurrency?: string }).baseCurrency ?? 'USD'
  return <BaseCurrencyFormFields initialCurrency={initialCurrency} />
}

function BaseCurrencyFormFields({
  initialCurrency,
}: {
  initialCurrency: string
}) {
  const t = useTranslations('Settings')
  const tCommon = useTranslations('Common.actions')
  const router = useRouter()
  const [currency, setCurrency] = useState(initialCurrency)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const timeout = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(timeout)
  }, [saved])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await updateBaseCurrency(currency)
    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xs space-y-4">
      <Label htmlFor="baseCurrency">{t('baseCurrency')}</Label>
      <Input
        id="baseCurrency"
        value={currency}
        maxLength={3}
        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {tCommon('save')}
        </Button>
        {saved && (
          <span className="text-sm font-medium text-(--positive)">
            {t('saved')}
          </span>
        )}
      </div>
    </form>
  )
}
