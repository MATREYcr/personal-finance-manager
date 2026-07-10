'use client'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function LanguageToggle() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      value={[locale]}
      onValueChange={(value: string[]) => {
        const next = value.find((v) => v !== locale)
        if (next) router.replace(pathname, { locale: next })
      }}
    >
      {routing.locales.map((l) => (
        <ToggleGroupItem
          key={l}
          value={l}
          aria-label={l}
          className="font-heading font-bold uppercase"
        >
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
