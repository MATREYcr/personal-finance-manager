'use client'
import { useTranslations } from 'next-intl'

export function AuthSplitPanel({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Auth')

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden w-[42%] flex-col justify-center gap-8 p-12 text-white md:flex"
        style={{
          background: 'linear-gradient(160deg, var(--primary), #4c1d95)',
        }}
      >
        <span className="font-heading text-xl font-bold">{t('brandName')}</span>
        <h1 className="font-heading text-4xl leading-tight font-semibold">
          {t('headline')}
        </h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}
