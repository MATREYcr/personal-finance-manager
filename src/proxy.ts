import createMiddleware from 'next-intl/middleware'
import { betterFetch } from '@better-fetch/fetch'
import type { Session } from 'better-auth/types'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

const protectedPaths = [
  '/dashboard',
  '/categories',
  '/transactions',
  '/recurring-transactions',
  '/settings',
]

export default async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request)

  const localeMatch = request.nextUrl.pathname.match(/^\/(es|en)(\/|$)/)
  const pathWithoutLocale = localeMatch
    ? request.nextUrl.pathname.slice(localeMatch[0].length - (localeMatch[2] ? 1 : 0)) || '/'
    : request.nextUrl.pathname

  const isProtected = protectedPaths.some((p) => pathWithoutLocale.startsWith(p))

  if (isProtected) {
    const { data: session } = await betterFetch<Session>('/api/auth/get-session', {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get('cookie') ?? '' },
    })

    if (!session) {
      const locale = localeMatch?.[1] ?? routing.defaultLocale
      return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
