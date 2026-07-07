'use client'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const LOCALES = ['es', 'en'] as const

export function LanguageToggle() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  return (
    // base-ui's ToggleGroup is multi-select (value is an array). We drive it as
    // a single-select segmented control: value is the current locale, and on
    // change we navigate to whichever item was newly pressed (clicking the
    // already-active one yields an empty array → no-op).
    <ToggleGroup
      variant="outline"
      size="sm"
      value={[locale]}
      onValueChange={(value: string[]) => {
        const next = value.find((v) => v !== locale)
        if (next) router.replace(pathname, { locale: next })
      }}
    >
      {LOCALES.map((l) => (
        <ToggleGroupItem key={l} value={l} aria-label={l} className="font-heading font-bold uppercase">
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
