'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { signOut, useSession } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { LayoutDashboard, Receipt, Tag, Repeat, Settings as SettingsIcon, LogOut, Menu } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/transactions', key: 'transactions', icon: Receipt },
  { href: '/categories', key: 'categories', icon: Tag },
  { href: '/recurring-transactions', key: 'recurring', icon: Repeat },
  { href: '/settings', key: 'settings', icon: SettingsIcon },
] as const

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('Common.nav')
  const pathname = usePathname()

  return (
    <div className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-md border-l-[3px] px-3.5 py-2.5 text-sm transition-colors ${
              active
                ? 'border-l-primary bg-primary/10 font-semibold text-primary'
                : 'border-l-transparent font-medium text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {t(key)}
          </Link>
        )
      })}
    </div>
  )
}

function UserChip({ name, email }: { name: string; email: string }) {
  const t = useTranslations('Common.nav')
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-2.5 rounded-md border bg-muted p-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-xs font-bold text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs font-medium text-primary">{email}</p>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={t('signOut')}
        onClick={() => signOut()}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations('Common')
  const tNav = useTranslations('Common.nav')
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const name = session?.user.name ?? ''
  const email = session?.user.email ?? ''

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar (mockup: 240px, hidden below md) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <div className="px-2.5 pb-5 pt-1 font-heading text-lg font-bold">{tCommon('appName')}</div>
        <NavLinks />
        <UserChip name={name} email={email} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar (mockup: 60px, right-aligned lang/theme toggles) */}
        <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-2 border-b bg-card px-4 md:justify-end md:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={tNav('menu')} className="md:hidden" />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle className="sr-only">{tNav('menu')}</SheetTitle>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
              <div className="mt-4">
                <UserChip name={name} email={email} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-heading text-lg font-bold md:hidden">{tCommon('appName')}</span>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
