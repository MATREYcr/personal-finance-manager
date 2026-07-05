# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js scaffold, Supabase/Prisma datasource, internationalized routing (Spanish default, English second) with light/dark mode, the complete domain schema, Better Auth, and a protected app shell — the shared foundation every later feature branch builds on.

**Architecture:** Next.js 15 App Router, single deployable app. Every route lives under a `[locale]` segment (`src/app/[locale]/...`); API routes (`src/app/api/...`) are not localized and stay outside it. `src/features/<domain>/` holds business logic (populated by later plans); this plan only creates shared infrastructure (`src/lib/`, `src/i18n/`, `messages/`, `prisma/schema.prisma`, `src/middleware.ts`, the locale/root and dashboard-group layouts).

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS + shadcn/ui, next-intl, next-themes, Prisma ORM, Supabase Postgres, Better Auth, TanStack Query, Vitest, npm.

**Branch:** `feature/foundation` (already checked out). PR target: `develop`. This is the first of five subsystem branches for v1 — no other subsystem branches should exist yet.

## Global Constraints

- Package manager is npm for every command in this plan — do not substitute pnpm/yarn.
- `app/` contains only Next.js routing files (`page.tsx`, `layout.tsx`, `route.ts`). All business logic lives under `src/features/<domain>/` (created by later plans).
- All UI must be responsive/mobile-first (`w-full`, `max-w-*`, `sm:`/`md:`/`lg:` breakpoints — never fixed pixel widths).
- All UI must be theme-aware: use shadcn's semantic Tailwind tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `text-destructive`, `border`, etc.) rather than hardcoded colors like `text-green-600`, so components work in both light and dark without extra work.
- All user-facing text goes through `next-intl` (`useTranslations` in Client Components, `getTranslations` in Server Components) — never a hardcoded string in JSX. Every later plan adds its own top-level namespace to `messages/es.json` and `messages/en.json`.
- Locale-aware navigation (`Link`, `useRouter`, `usePathname`, `redirect`) always imports from `@/i18n/navigation`, never from `next/navigation` directly — the wrappers there preserve the current locale automatically.
- This plan does not implement any business feature (no category/transaction CRUD, no dashboard). Its only job is scaffold + i18n + theming + schema + auth + shell.

---

## File Structure

```
personal-finance-manager/
├── messages/{es.json,en.json}
├── prisma/{schema.prisma,migrations/}
├── src/
│   ├── i18n/{routing.ts,request.ts,navigation.ts}
│   ├── app/
│   │   ├── api/auth/[...all]/route.ts      ← not localized
│   │   └── [locale]/
│   │       ├── (auth)/{sign-in/page.tsx,sign-up/page.tsx}
│   │       ├── (dashboard)/layout.tsx       ← empty feature pages added by later plans
│   │       ├── layout.tsx
│   │       └── page.tsx                     ← redirects to /dashboard
│   ├── components/
│   │   ├── ui/                              ← shadcn/ui components
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── lib/
│   │   ├── auth/{index.ts,client.ts,session.ts}
│   │   ├── db/index.ts
│   │   └── query/{client.tsx,keys.ts}
│   └── middleware.ts
├── next.config.ts                            ← wrapped with next-intl plugin
├── vercel.json                               ← created here empty-ish, appended to by later cron-adding plans
├── vitest.config.ts
├── .env.example
└── package.json
```

---

### Task 1: Project scaffold, Tailwind, shadcn, Vitest

**Files:**
- Create: whole Next.js project (via CLI) rooted at `d:/personal_projects/personal-finance-manager`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test`/`test:watch` scripts)

**Interfaces:**
- Produces: a running `npm run dev` app, `npm test` running Vitest, shadcn's `cn()` util at `src/lib/utils.ts`, dark-mode-ready CSS variables in `globals.css` (from `shadcn init`).

- [ ] **Step 1: Scaffold the Next.js app**

Run from `d:/personal_projects/personal-finance-manager` (repo root):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

If prompted anyway: App Router = Yes, `src/` directory = Yes, Turbopack = No, import alias = `@/*`.

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev -- --port 3100 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100`, then stop the server.
Expected: HTTP 200.

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init -d
```

This also sets up the `.dark` CSS variable overrides in `globals.css` that `next-themes` will toggle in Task 4, and installs `lucide-react` (used for icons, e.g. the theme toggle in Task 4).

- [ ] **Step 4: Add the shadcn components this project will need**

```bash
npx shadcn@latest add button input label card dialog form table select tabs badge
```

- [ ] **Step 5: Install Vitest and path-alias support**

```bash
npm install -D vitest vite-tsconfig-paths
```

- [ ] **Step 6: Create the Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 7: Add test scripts to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 8: Verify the test runner works**

Create a throwaway `src/sanity.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```
Run: `npm test` — expect 1 passed. Then delete `src/sanity.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(scaffold): initialize Next.js app with Tailwind, shadcn/ui, and Vitest"
```

---

### Task 2: Prisma + Supabase datasource

**Prerequisite (human action, not automatable):** create a free Supabase project at supabase.com, then from Project Settings → Database copy the **pooled connection string** (port 6543, `?pgbouncer=true&connection_limit=1`) and the **direct connection string** (port 5432).

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db/index.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `db` singleton at `@/lib/db`, used by every later feature.

- [ ] **Step 1: Install Prisma**

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Configure the datasource**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- [ ] **Step 3: Create the Prisma singleton**

```typescript
// src/lib/db/index.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

- [ ] **Step 4: Document required env vars**

```bash
# .env.example
DATABASE_URL=
DIRECT_URL=

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

CRON_SECRET=
```

Fill in real values in `.env.local` (`CRON_SECRET` isn't used until the Currency/FX/Dashboard plan, but document it now since it's part of this shared `.env.example`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(db): configure Prisma with Supabase Postgres datasource"
```

---

### Task 3: Internationalization (next-intl) — Spanish default, English second

**Files:**
- Create: `messages/es.json`
- Create: `messages/en.json`
- Create: `src/i18n/routing.ts`
- Create: `src/i18n/request.ts`
- Create: `src/i18n/navigation.ts`
- Modify: `next.config.ts`
- Create: `src/middleware.ts` (base i18n-only version — Task 5 adds auth protection on top)
- Create: `src/app/[locale]/layout.tsx` (replaces the default `src/app/layout.tsx` generated in Task 1 — delete that file)

**Interfaces:**
- Produces: `routing` (locales, defaultLocale) at `@/i18n/routing`; `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` at `@/i18n/navigation`; the `messages/*.json` catalogs every later plan adds its namespace to.

- [ ] **Step 1: Install next-intl**

```bash
npm install next-intl
```

- [ ] **Step 2: Define the supported locales**

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
})
```

- [ ] **Step 3: Request config (which messages to load per request)**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 4: Locale-aware navigation wrappers**

```typescript
// src/i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
```

- [ ] **Step 5: Wrap Next config with the next-intl plugin**

```typescript
// next.config.ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
```

- [ ] **Step 6: Initial message catalogs**

```json
// messages/es.json
{
  "Common": {
    "appName": "Gestor de Finanzas Personales",
    "loading": "Cargando…"
  }
}
```

```json
// messages/en.json
{
  "Common": {
    "appName": "Personal Finance Manager",
    "loading": "Loading…"
  }
}
```

- [ ] **Step 7: Base middleware (locale detection/redirect only — Task 5 layers auth on top)**

```typescript
// src/middleware.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
```

- [ ] **Step 8: Locale layout**

Delete `src/app/layout.tsx` (generated in Task 1) and create:

```typescript
// src/app/[locale]/layout.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import '../globals.css'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Common' })
  return { title: t('appName') }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
```

> Note the relative import `'../globals.css'` — `globals.css` was generated by Task 1 at `src/app/globals.css` and stays there; only `layout.tsx` moves down into `[locale]/`. Theming (Task 4) and the QueryProvider (Task 7) each add their own wrapper inside `<NextIntlClientProvider>` — do not replace this file wholesale in later tasks, only nest additional providers inside it.

- [ ] **Step 9: Manual verification**

Run `npm run dev`. Visiting `/` redirects to `/es` (default locale) and renders without error (a blank/empty body is expected — no page content exists yet until Task 7's root page). Visiting `/en` directly also works. Visiting `/fr` (unsupported locale) 404s.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(i18n): add next-intl routing with Spanish default and English locales"
```

---

### Task 4: Light/dark mode (next-themes)

**Files:**
- Create: `src/components/theme-provider.tsx`
- Create: `src/components/theme-toggle.tsx`
- Modify: `src/app/[locale]/layout.tsx`

**Interfaces:**
- Produces: `<ThemeProvider>` (wraps `next-themes`) and `<ThemeToggle>`, consumed by Task 7's nav shell.

- [ ] **Step 1: Install next-themes**

```bash
npm install next-themes
```

- [ ] **Step 2: Theme provider**

```typescript
// src/components/theme-provider.tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  )
}
```

- [ ] **Step 3: Theme toggle button**

```typescript
// src/components/theme-toggle.tsx
'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null // avoid a hydration mismatch flashing the wrong icon

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
```

- [ ] **Step 4: Wrap the locale layout's body with the theme provider**

In `src/app/[locale]/layout.tsx` (from Task 3), nest `<ThemeProvider>` inside `<NextIntlClientProvider>`:

```typescript
// src/app/[locale]/layout.tsx — only the changed return statement shown
import { ThemeProvider } from '@/components/theme-provider'

// ...
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
```

Add `suppressHydrationWarning` to `<html>` — `next-themes` sets the `class` attribute on the client before hydration completes, which otherwise logs a harmless warning.

- [ ] **Step 5: Manual verification**

Run `npm run dev`. No visible UI exists yet to click a toggle (that's wired into the nav in Task 7), but confirm no console errors/hydration warnings on `/es` and that the `<html>` element's `class` reflects the OS theme preference (inspect via devtools).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(theme): add next-themes light/dark mode support"
```

---

### Task 5: Better Auth setup

**Files:**
- Create: `src/lib/auth/index.ts`
- Create: `src/lib/auth/client.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Modify: `src/middleware.ts` (layer auth protection on top of the i18n middleware from Task 3)
- Create: `src/app/[locale]/(auth)/sign-in/page.tsx`
- Create: `src/app/[locale]/(auth)/sign-up/page.tsx`
- Modify: `messages/es.json`, `messages/en.json` (add `Auth` namespace)
- Modify: `prisma/schema.prisma` (adds User/Session/Account/Verification, generated)

**Interfaces:**
- Produces: `auth` (server instance) and `requireSession()` at `@/lib/auth` / `@/lib/auth/session`, `signIn`/`signUp`/`signOut`/`useSession` at `@/lib/auth/client`. `session.user.id` (string) and `session.user.baseCurrency` (string) are used by every later feature.

- [ ] **Step 1: Install Better Auth**

```bash
npm install better-auth
```

- [ ] **Step 2: Create the server auth instance with the baseCurrency field**

```typescript
// src/lib/auth/index.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from '@/lib/db'

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      baseCurrency: {
        type: 'string',
        required: false,
        defaultValue: 'USD',
        input: false,
      },
    },
  },
})
```

> The Categories plan will extend this file with a `databaseHooks.user.create.after` hook to seed default categories on signup — leave `betterAuth({...})` as a single exported config object so that later addition is a small, additive edit.

- [ ] **Step 3: Create the browser auth client**

```typescript
// src/lib/auth/client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
})

export const { signIn, signOut, signUp, useSession } = authClient
```

- [ ] **Step 4: Create the shared session helper used by every Server Action**

```typescript
// src/lib/auth/session.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    // Defensive backstop only — middleware already redirects unauthenticated
    // requests away from every route that calls this, so this message is
    // never actually shown to a user and is intentionally not translated.
    throw new Error('Not authenticated')
  }
  return session
}
```

- [ ] **Step 5: Wire the Better Auth API route (not localized — stays outside `[locale]`)**

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

- [ ] **Step 6: Generate the Better Auth Prisma schema**

```bash
npx auth@latest generate
```

Expected: `prisma/schema.prisma` now also contains `User`, `Session`, `Account`, `Verification` models, with `User.baseCurrency String @default("USD")`.

- [ ] **Step 7: Run the first migration**

```bash
npx prisma migrate dev --name add_better_auth_tables
```

- [ ] **Step 8: Layer route protection onto the i18n middleware**

Replace the Task 3 base middleware with the combined version:

```typescript
// src/middleware.ts
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

export default async function middleware(request: NextRequest) {
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
```

`betterFetch` ships as a transitive dependency of `better-auth`; if the import fails, run `npm install @better-fetch/fetch`.

- [ ] **Step 9: Add the Auth namespace to both message catalogs**

```json
// messages/es.json — add alongside "Common"
  "Auth": {
    "signInTitle": "Iniciar sesión",
    "signUpTitle": "Crear tu cuenta",
    "name": "Nombre",
    "email": "Email",
    "password": "Contraseña",
    "signInSubmit": "Entrar",
    "signUpSubmit": "Registrarme",
    "signInError": "No se pudo iniciar sesión",
    "signUpError": "No se pudo crear la cuenta"
  }
```

```json
// messages/en.json — add alongside "Common"
  "Auth": {
    "signInTitle": "Sign in",
    "signUpTitle": "Create your account",
    "name": "Name",
    "email": "Email",
    "password": "Password",
    "signInSubmit": "Sign in",
    "signUpSubmit": "Sign up",
    "signInError": "Could not sign in",
    "signUpError": "Could not sign up"
  }
```

- [ ] **Step 10: Sign-in page**

```typescript
// src/app/[locale]/(auth)/sign-in/page.tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { signIn } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: signInError } = await signIn.email({ email, password })
    if (signInError) {
      setError(signInError.message ?? t('signInError'))
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('signInTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">{t('signInSubmit')}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 11: Sign-up page**

```typescript
// src/app/[locale]/(auth)/sign-up/page.tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { signUp } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: signUpError } = await signUp.email({ name, email, password })
    if (signUpError) {
      setError(signUpError.message ?? t('signUpError'))
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('signUpTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder={t('name')} value={name} onChange={(e) => setName(e.target.value)} required />
            <Input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">{t('signUpSubmit')}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 12: Manual verification**

Run `npm run dev`, visit `/es/sign-up`, create an account, confirm redirect lands on a `/es/dashboard` URL (a 404 is expected there until Task 7 — confirm you're not bounced back to `/es/sign-in`). Repeat on `/en/sign-up` and confirm the form renders in English and lands on `/en/dashboard`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(auth): add Better Auth email/password sign-in and sign-up"
```

---

### Task 6: Domain Prisma models (full schema for all v1 subsystems)

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Category`, `Transaction`, `RecurringTransaction`, `ExchangeRate` models and the `TransactionType` / `RecurrenceFrequency` enums. Every later plan (Categories, Transactions, Recurring Transactions, Currency/FX/Dashboard) consumes these — none of them modify `schema.prisma` again for these tables.

- [ ] **Step 1: Add the domain enums and models**

Append to `prisma/schema.prisma` (keep the existing `generator`, `datasource`, and Better Auth models untouched):

```prisma
enum TransactionType {
  EXPENSE
  INCOME
}

enum RecurrenceFrequency {
  WEEKLY
  MONTHLY
  YEARLY
}

model Category {
  id        String          @id @default(cuid())
  userId    String
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  type      TransactionType
  createdAt DateTime        @default(now())

  transactions          Transaction[]
  recurringTransactions RecurringTransaction[]

  @@unique([userId, name, type])
}

model Transaction {
  id          String                @id @default(cuid())
  userId      String
  user        User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String
  category    Category              @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  type        TransactionType
  amount      Decimal               @db.Decimal(12, 2)
  currency    String
  date        DateTime
  note        String?
  recurringId String?
  recurring   RecurringTransaction? @relation(fields: [recurringId], references: [id], onDelete: SetNull)
  createdAt   DateTime              @default(now())

  @@index([userId, date])
}

model RecurringTransaction {
  id          String              @id @default(cuid())
  userId      String
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String
  category    Category            @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  type        TransactionType
  amount      Decimal             @db.Decimal(12, 2)
  currency    String
  frequency   RecurrenceFrequency
  nextRunDate DateTime
  note        String?
  active      Boolean             @default(true)
  createdAt   DateTime            @default(now())

  transactions Transaction[]

  @@index([active, nextRunDate])
}

model ExchangeRate {
  id             String   @id @default(cuid())
  targetCurrency String   @unique
  rate           Decimal  @db.Decimal(18, 8)
  fetchedAt      DateTime @default(now())
}
```

- [ ] **Step 2: Add the reverse relations to the Better-Auth-generated User model**

Find `model User { ... }` (generated in Task 5) and add these three lines inside it, alongside `sessions`/`accounts`:

```prisma
  categories             Category[]
  transactions           Transaction[]
  recurringTransactions  RecurringTransaction[]
```

- [ ] **Step 3: Run the migration**

```bash
npx prisma migrate dev --name add_finance_domain_models
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(schema): add Category, Transaction, RecurringTransaction, ExchangeRate models"
```

---

### Task 7: TanStack Query provider, shared query keys, and protected app shell

**Files:**
- Create: `src/lib/query/client.tsx`
- Create: `src/lib/query/keys.ts`
- Modify: `src/app/[locale]/layout.tsx`
- Create: `src/app/[locale]/(dashboard)/layout.tsx`
- Create: `src/app/[locale]/page.tsx`
- Modify: `messages/es.json`, `messages/en.json` (add full `Common.nav` / `Common.actions`)

**Interfaces:**
- Produces: `<QueryProvider>` wrapping the app, `queryKeys` (extended by every later plan — each adds its own top-level key, e.g. `queryKeys.categories`), the persistent nav shell all authenticated feature pages render inside.

- [ ] **Step 1: Install TanStack Query**

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

- [ ] **Step 2: QueryClientProvider**

```typescript
// src/lib/query/client.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1000 * 60 * 5, retry: 1 },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Nest QueryProvider into the locale layout (alongside NextIntlClientProvider + ThemeProvider from Tasks 3-4)**

```typescript
// src/app/[locale]/layout.tsx — only the changed return statement shown
import { QueryProvider } from '@/lib/query/client'

// ...
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>
            <QueryProvider>{children}</QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
```

- [ ] **Step 4: Shared query keys file (later plans add to this, not replace it)**

```typescript
// src/lib/query/keys.ts
export const queryKeys = {
  // Later plans append their own top-level key here, e.g.:
  // categories: { all: ['categories'] as const },
  // transactions: { all: [...], list: (filters) => [...] },
  // recurringTransactions: { all: [...] },
}
```

- [ ] **Step 5: Add full nav/action labels to both message catalogs**

```json
// messages/es.json — add alongside "Common" (extends the existing "loading"/"appName" keys)
  "Common": {
    "appName": "Gestor de Finanzas Personales",
    "loading": "Cargando…",
    "nav": {
      "dashboard": "Panel",
      "transactions": "Transacciones",
      "categories": "Categorías",
      "recurring": "Recurrentes",
      "settings": "Configuración",
      "signOut": "Cerrar sesión"
    },
    "actions": {
      "save": "Guardar",
      "edit": "Editar",
      "delete": "Eliminar",
      "cancel": "Cancelar",
      "new": "Nuevo"
    }
  }
```

```json
// messages/en.json — add alongside "Common"
  "Common": {
    "appName": "Personal Finance Manager",
    "loading": "Loading…",
    "nav": {
      "dashboard": "Dashboard",
      "transactions": "Transactions",
      "categories": "Categories",
      "recurring": "Recurring",
      "settings": "Settings",
      "signOut": "Sign out"
    },
    "actions": {
      "save": "Save",
      "edit": "Edit",
      "delete": "Delete",
      "cancel": "Cancel",
      "new": "New"
    }
  }
```

- [ ] **Step 6: Protected-area layout with navigation, translated and theme-aware**

```typescript
// src/app/[locale]/(dashboard)/layout.tsx
'use client'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { signOut } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Common.nav')
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/transactions', label: t('transactions') },
    { href: '/categories', label: t('categories') },
    { href: '/recurring-transactions', label: t('recurring') },
    { href: '/settings', label: t('settings') },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname.startsWith(link.href) ? 'font-semibold' : 'text-muted-foreground'}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => signOut()}>{t('signOut')}</Button>
        </div>
      </nav>
      <main className="flex-1 w-full">{children}</main>
    </div>
  )
}
```

> This links to five routes that don't have pages yet — that's expected. Each later plan creates its own `src/app/[locale]/(dashboard)/<feature>/page.tsx`. A 404 on those links until then is correct.

- [ ] **Step 7: Root redirect page (locale-aware)**

`redirect` from `@/i18n/navigation` requires an explicit `locale` argument (it does not infer it), so read it from the route's `params`:

```typescript
// src/app/[locale]/page.tsx
import { redirect } from '@/i18n/navigation'

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: '/dashboard', locale })
}
```

- [ ] **Step 8: Manual verification**

Run `npm run dev`. Signed out, visiting `/` redirects to `/es/sign-in`. Signed in, `/` redirects to `/es/dashboard` (404 page is expected/correct — no dashboard page exists yet), the nav bar renders in Spanish with all five links, a working theme toggle, and a working Sign out button. Switch to `/en/...` and confirm the same nav renders in English.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(shell): add TanStack Query provider, shared query keys, and protected nav shell"
```

---

### Task 8: Open the PR to develop

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```
Expected: passes (only the scaffold sanity — no feature tests exist yet in this plan).

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feature/foundation
gh pr create --base develop --title "Foundation: scaffold, i18n, theming, auth, domain schema, app shell" --body "Implements docs/superpowers/specs/2026-07-04-foundation-design.md. Every later v1 subsystem branch (Categories, Transactions, Recurring Transactions, Currency/FX/Dashboard) depends on this being merged first."
```
