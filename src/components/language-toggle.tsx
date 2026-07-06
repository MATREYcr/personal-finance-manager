'use client'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const LOCALES = ['es', 'en'] as const

export function LanguageToggle() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="flex items-center gap-0.5 rounded-md border bg-muted p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={cn(
            'rounded-sm px-2.5 py-1 font-heading text-sm font-bold uppercase transition-colors',
            l === locale ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
