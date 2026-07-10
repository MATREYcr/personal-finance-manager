'use client'
import { useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { signOut, useSession } from '@/lib/auth/client'
import { ROUTES } from '@/lib/constants/routes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Receipt,
  Tag,
  Repeat,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD, key: 'dashboard', icon: LayoutDashboard },
  { href: ROUTES.TRANSACTIONS, key: 'transactions', icon: Receipt },
  { href: ROUTES.CATEGORIES, key: 'categories', icon: Tag },
  { href: ROUTES.RECURRING_TRANSACTIONS, key: 'recurring', icon: Repeat },
  { href: ROUTES.SETTINGS, key: 'settings', icon: SettingsIcon },
] as const

export function AppSidebar() {
  const tCommon = useTranslations('Common')
  const tNav = useTranslations('Common.nav')
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const { data: session } = useSession()
  const name = session?.user.name ?? ''
  const email = session?.user.email ?? ''
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="font-heading px-2 py-1 text-lg font-bold group-data-[collapsible=icon]:hidden">
          {tCommon('appName')}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(href)}
                  tooltip={tNav(key)}
                  render={
                    <Link
                      href={href}
                      onClick={() => isMobile && setOpenMobile(false)}
                    />
                  }
                >
                  <Icon />
                  <span>{tNav(key)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2">
          <Avatar className="shrink-0">
            <AvatarFallback className="from-primary bg-linear-to-br to-blue-600 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-muted-foreground truncate text-xs">{email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tNav('signOut')}
            onClick={async () => {
              await signOut()
              router.push(ROUTES.SIGN_IN)
            }}
            className="shrink-0 group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
