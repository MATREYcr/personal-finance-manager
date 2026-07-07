'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/auth/client'
import { updateBaseCurrency } from '../actions'

export function BaseCurrencyForm() {
  // useSession() (better-auth, no cookieCache) is undefined on first render and
  // resolves asynchronously. Gate the actual form behind a loaded session so its
  // useState initializer captures the user's REAL baseCurrency — initializing
  // from a still-undefined session would pin the input to 'USD' forever (the
  // lazy initializer only runs once at mount) and silently overwrite a saved
  // 'EUR' back to 'USD' on the next save.
  const { data: session, isPending } = useSession()
  if (isPending || !session) return null
  const initialCurrency = (session.user as { baseCurrency?: string }).baseCurrency ?? 'USD'
  return <BaseCurrencyFormFields initialCurrency={initialCurrency} />
}

function BaseCurrencyFormFields({ initialCurrency }: { initialCurrency: string }) {
  const t = useTranslations('Settings')
  const tCommon = useTranslations('Common.actions')
  const router = useRouter()
  const [currency, setCurrency] = useState(initialCurrency)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Auto-hide the "Saved" confirmation after a few seconds rather than leaving it on screen forever.
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
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xs">
      <label className="block text-sm font-medium">{t('baseCurrency')}</label>
      <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>{tCommon('save')}</Button>
        {saved && <span className="text-sm font-medium text-(--positive)">{t('saved')}</span>}
      </div>
    </form>
  )
}
