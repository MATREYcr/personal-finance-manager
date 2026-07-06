# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js scaffold, Supabase/Prisma datasource, internationalized routing (Spanish default, English second) with light/dark mode, the complete domain schema, Better Auth, and a protected app shell — the shared foundation every later feature branch builds on.

**Architecture:** Next.js 15 App Router, single deployable app. Every route lives under a `[locale]` segment (`src/app/[locale]/...`); API routes (`src/app/api/...`) are not localized and stay outside it. `src/features/<domain>/` holds business logic (populated by later plans); this plan only creates shared infrastructure (`src/lib/`, `src/i18n/`, `messages/`, `prisma/schema.prisma`, `src/proxy.ts` (the file Next.js 16 calls what was `middleware.ts` in Next.js ≤15 — same role, same next-intl API, just the renamed file convention), the locale/root and dashboard-group layouts).

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
- **Environment note (Windows only):** launching `npm run dev` from inside Git Bash/MSYS on this machine reproducibly crashes Turbopack's PostCSS worker process with a Windows `0xc0000142` (`STATUS_DLL_INIT_FAILED`) error the moment a route that actually compiles `globals.css` is requested (confirmed: `/es/sign-up` 500'd every time under Git Bash, 200'd immediately when the exact same dev server was instead launched via `cmd.exe`/PowerShell). If any manual-verification step in this plan needs to hit a real page route (not just an API route or a redirect check), start `npm run dev` via PowerShell/cmd, not Git Bash. This is specific to this OS/shell combination, not a code defect — do not attempt to "fix" it in application code.

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
│   │   ├── theme-toggle.tsx
│   │   ├── language-toggle.tsx
│   │   └── auth-split-panel.tsx
│   ├── lib/
│   │   ├── auth/{index.ts,client.ts,session.ts}
│   │   ├── db/index.ts
│   │   └── query/{client.tsx,keys.ts}
│   └── proxy.ts                            ← was middleware.ts before Next.js 16
├── next.config.ts                            ← wrapped with next-intl plugin
├── prisma.config.ts                          ← Prisma 7: datasource URLs live here, not in schema.prisma
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
npx shadcn@latest add button input label card dialog table select tabs badge alert sheet
```

(`alert` backs the Categories delete-blocked error; `sheet` backs the mobile nav drawer — both added in later plans/steps. Do **not** add `form` — no plan in this project imports shadcn's `Form`/`FormField` wrapper; every form dialog uses `react-hook-form` directly with `Input`/`Select`/`Label`/`Button`. If your shadcn version's `form` registry entry is broken/stub for the active style, that's fine — it's unused here.)

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

- [ ] **Step 9: Apply the design system's color, radius, and shadow tokens**

The mockup at `docs/design/` (see `docs/design/reference/tokens/colors.css`,
`radius.css`, `shadows.css`) is the source of truth for these values.
Replace the color block `shadcn init` generated in `src/app/globals.css`
(both the default `:root` block and the `.dark` block) with:

```css
/* src/app/globals.css — replace the color custom properties shadcn init generated */
:root {
  --radius: 0.75rem; /* shadcn derives sm/md/lg/xl from this; ~8/10/12/16px, close to the mockup's 8/12/14 */

  --background: #f7f7f8;
  --foreground: #09090b;
  --card: #ffffff;
  --card-foreground: #09090b;
  --popover: #ffffff;
  --popover-foreground: #09090b;
  --primary: #7c3aed;
  --primary-foreground: #ffffff;
  --secondary: #f4f4f5;
  --secondary-foreground: #09090b;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;
  --accent: #f4f4f5;
  --accent-foreground: #09090b;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #e4e4e7;
  --input: #d4d4d8;
  --ring: rgba(124, 58, 237, 0.35);

  /* Semantic tokens the mockup uses that shadcn doesn't ship by default */
  --positive: #15803d;
  --positive-bg: #dcfce7;
  --warning: #b45309;
  --warning-bg: #fffbeb;
}

.dark {
  --background: #0a0a0b;
  --foreground: #fafafa;
  --card: #161618;
  --card-foreground: #fafafa;
  --popover: #161618;
  --popover-foreground: #fafafa;
  --primary: #9d6bff;
  --primary-foreground: #ffffff;
  --secondary: #1c1c1f;
  --secondary-foreground: #fafafa;
  --muted: #1c1c1f;
  --muted-foreground: #a1a1aa;
  --accent: #1c1c1f;
  --accent-foreground: #fafafa;
  --destructive: #f87171;
  --destructive-foreground: #ffffff;
  --border: #27272a;
  --input: #27272a;
  --ring: rgba(157, 107, 255, 0.35);

  --positive: #4ade80;
  --positive-bg: rgba(74, 222, 128, 0.13);
  --warning: #fbbf24;
  --warning-bg: rgba(251, 191, 36, 0.12);
}
```

`--positive`/`--positive-bg`/`--warning`/`--warning-bg` aren't part of
shadcn's default palette — reference them in later plans via Tailwind's
arbitrary-value syntax (e.g. `text-[var(--positive)]`,
`bg-[var(--positive-bg)]`), which works regardless of Tailwind version.

The Geist font (the mockup's only typeface) is applied in Task 3 Step 8,
where `src/app/[locale]/layout.tsx` is first created — `next/font/google`
needs no separate install, it ships with Next.js.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(scaffold): initialize Next.js app with Tailwind, shadcn/ui, and Vitest, applying the mockup's color/radius/shadow tokens"
```

---

### Task 2: Prisma + Supabase datasource

**Prerequisite (human action, not automatable):** create a free Supabase project at supabase.com, then from Project Settings → Database copy the **pooled connection string** (port 6543, `?pgbouncer=true&connection_limit=1`) and the **direct connection string** (port 5432).

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma.config.ts`
- Create: `src/lib/db/index.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `db` singleton at `@/lib/db`, used by every later feature.

**Prisma version note:** as of Prisma 7, datasource URLs no longer live in
`schema.prisma`, Prisma's CLI no longer auto-loads any `.env` file (not
even `.env`, and never `.env.local`), and — this is the part that actually
matters for Supabase — `PrismaClient` **requires an explicit driver
adapter** at runtime; `new PrismaClient()` with no arguments throws
`PrismaClientInitializationError: PrismaClient requires a driver adapter`.
Three separate things to get right, verified end-to-end against a real
Supabase project while building this task:

1. **`prisma.config.ts` (CLI-only: migrate, studio, validate).** Its
   `datasource` object accepts `url` and `shadowDatabaseUrl` — there is
   **no `directUrl` key** in this new config shape (unlike the old
   `schema.prisma` datasource block). Set its `url` to **`DIRECT_URL`**
   (the session-mode/direct connection), not `DATABASE_URL`. Pointing it
   at the transaction-mode pooled `DATABASE_URL` (port 6543) produced a
   reproducible `ERROR: prepared statement "s1" already exists` and, on
   other attempts, an indefinite hang — PgBouncer's transaction pooling
   mode doesn't give the schema engine the session-level guarantees
   `migrate`/`validate` need. `DIRECT_URL`'s session-mode pooler (port
   5432) does not have this problem.
2. **Explicit `.env.local` loading.** A bare `import "dotenv/config"`
   only loads `.env`, never `.env.local` — this project (like Next.js
   convention) keeps real secrets in `.env.local`, so `prisma.config.ts`
   must call `config({ path: '.env.local' })` explicitly, or every env
   var reads as `undefined`.
3. **`src/lib/db/index.ts` (app runtime).** Needs `@prisma/adapter-pg`'s
   `PrismaPg`, constructed with **`DATABASE_URL`** (the pooled,
   transaction-mode connection — appropriate here since app-runtime
   queries are exactly the high-concurrency, short-lived case PgBouncer
   transaction pooling is designed for). This is a completely separate
   connection/config path from `prisma.config.ts` — the CLI config does
   not feed the generated client at all in Prisma 7.

- [ ] **Step 1: Install Prisma**

```bash
npm install prisma @prisma/client @prisma/adapter-pg
npm install -D dotenv
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Configure the datasource**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

```typescript
// prisma.config.ts
import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // CLI-only (migrate/studio/validate). Must be the session/direct
  // connection (DIRECT_URL) — the transaction-mode pooled DATABASE_URL
  // causes "prepared statement already exists" errors or hangs here.
  // There is no `directUrl` key in Prisma 7's config shape.
  datasource: {
    url: process.env.DIRECT_URL,
  },
})
```

Run `npx prisma validate` and confirm it prints "The schema ... is valid"
before continuing — this catches a missing `dotenv` install immediately
rather than surfacing as a confusing failure in a later task's migration
step.

- [ ] **Step 3: Create the Prisma singleton**

Prisma 7's `PrismaClient` requires an explicit driver adapter — it will
not implicitly read any connection string on its own. Use the pooled
`DATABASE_URL` here (transaction-mode pooling suits the app's normal
concurrent query traffic; this is intentionally the *other* URL from
`prisma.config.ts`'s `DIRECT_URL`).

```typescript
// src/lib/db/index.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter })

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
- Create: `src/proxy.ts` (base i18n-only version — Task 5 adds auth protection on top; named `proxy.ts` because Next.js 16 renamed the `middleware.ts` file convention — same role, same next-intl API)
- Create: `src/app/[locale]/layout.tsx` (replaces the default `src/app/layout.tsx` generated in Task 1 — delete that file, and also delete the sibling `src/app/page.tsx` create-next-app generated, since it's unreachable once the locale middleware/proxy is in place and would otherwise sit as dead, misleading placeholder content)

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

- [ ] **Step 7: Base proxy/middleware (locale detection/redirect only — Task 5 layers auth on top)**

Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (same role, same next-intl API — verify which your installed Next.js version expects; if it's Next.js ≤15, name this file `middleware.ts` instead and skip the rename note in later steps).

```typescript
// src/proxy.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
```

- [ ] **Step 8: Locale layout**

Delete `src/app/layout.tsx` (generated in Task 1) — and also `src/app/page.tsx` (create-next-app's default splash page), since it becomes dead/unreachable code once the proxy unconditionally redirects `/` into a locale — then create:

```typescript
// src/app/[locale]/layout.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Geist } from 'next/font/google'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import '../globals.css'

const geist = Geist({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

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
      <body className={geist.className}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
```

> Note the relative import `'../globals.css'` — `globals.css` was generated by Task 1 at `src/app/globals.css` and stays there; only `layout.tsx` moves down into `[locale]/`. Geist (via `next/font/google`, no separate install needed) is the mockup's only typeface — applied once here via `geist.className` on `<body>`, inherited by every page. Theming (Task 4) and the QueryProvider (Task 7) each add their own wrapper inside `<NextIntlClientProvider>` — do not replace this file wholesale in later tasks, only nest additional providers inside it.

- [ ] **Step 9: Manual verification**

Run `npm run dev`. Visiting `/` redirects (307) to `/es` (default locale). Visiting `/es` and `/en` directly each correctly negotiate that locale (confirm via the `NEXT_LOCALE` cookie) — but since no `page.tsx` exists yet under `[locale]/` (that's Task 7's job), Next.js's App Router correctly 404s both routes rather than rendering blank; that 404 is the expected, correct result for this task, not a bug. Visiting `/fr` (unsupported locale) ends up 404 as well, whether via a direct 404 or via a redirect to the default locale first, depending on next-intl's version behavior.

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
- Modify: `src/proxy.ts` (layer auth protection on top of the i18n proxy/middleware from Task 3 — named `middleware.ts` instead if Task 3 used that name for your Next.js version)
- Create: `src/components/auth-split-panel.tsx`
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

- [ ] **Step 8: Layer route protection onto the i18n proxy/middleware**

Replace the Task 3 base proxy/middleware with the combined version (file named `src/proxy.ts` on Next.js 16+, `src/middleware.ts` on Next.js ≤15 — match whatever Task 3 actually created):

```typescript
// src/proxy.ts
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
```

`betterFetch` ships as a transitive dependency of `better-auth`; if the import fails, run `npm install @better-fetch/fetch`.

- [ ] **Step 9: Add the Auth namespace to both message catalogs**

```json
// messages/es.json — add alongside "Common"
  "Auth": {
    "brandName": "Gestor de Finanzas Personales",
    "headline": "Sabé a dónde va tu dinero.",
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
    "brandName": "Personal Finance Manager",
    "headline": "Know where your money goes.",
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

- [ ] **Step 10: Auth split-screen brand panel**

Matches the mockup's `Auth.jsx`: a gradient brand panel on the left (≥768px only), form on the right.

```typescript
// src/components/auth-split-panel.tsx
'use client'
import { useTranslations } from 'next-intl'

export function AuthSplitPanel({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Auth')

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden w-[42%] flex-col justify-center gap-8 p-12 text-white md:flex"
        style={{ background: 'linear-gradient(160deg, var(--primary), #4c1d95)' }}
      >
        <span className="font-heading text-xl font-bold">{t('brandName')}</span>
        <h1 className="font-heading text-4xl font-semibold leading-tight">{t('headline')}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">{children}</div>
    </div>
  )
}
```

- [ ] **Step 11: Sign-in page**

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
import { AuthSplitPanel } from '@/components/auth-split-panel'

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
    <AuthSplitPanel>
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
    </AuthSplitPanel>
  )
}
```

- [ ] **Step 12: Sign-up page**

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
import { AuthSplitPanel } from '@/components/auth-split-panel'

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
    <AuthSplitPanel>
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
    </AuthSplitPanel>
  )
}
```

- [ ] **Step 13: Manual verification**

Run `npm run dev`, visit `/es/sign-up`. At desktop width, confirm the purple gradient brand panel renders on the left with the wordmark + headline, and the form card sits centered on the right. Narrow the viewport below 768px and confirm the brand panel disappears, leaving only the centered form. Create an account, confirm redirect lands on a `/es/dashboard` URL (a 404 is expected there until Task 7 — confirm you're not bounced back to `/es/sign-in`). Repeat on `/en/sign-up` and confirm the form and headline render in English and lands on `/en/dashboard`.

- [ ] **Step 14: Commit**

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
- Create: `src/components/language-toggle.tsx`
- Create: `src/app/[locale]/(dashboard)/layout.tsx`
- Create: `src/app/[locale]/page.tsx`
- Modify: `messages/es.json`, `messages/en.json` (add full `Common.nav` / `Common.actions`)

**Interfaces:**
- Produces: `<QueryProvider>` wrapping the app, `queryKeys` (extended by every later plan — each adds its own top-level key, e.g. `queryKeys.categories`), `<LanguageToggle>`, the persistent nav shell (sidebar + topbar, per the mockup) all authenticated feature pages render inside.

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

`nav.menu` is the hamburger button's aria-label, used by the mobile drawer trigger in Step 7 below — nest it inside `nav`, not as a sibling of `actions` (the code calls `useTranslations('Common.nav')` and then `t('menu')`, so it must resolve at `Common.nav.menu`).

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
      "signOut": "Cerrar sesión",
      "menu": "Menú"
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
      "signOut": "Sign out",
      "menu": "Menu"
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

- [ ] **Step 6: Language toggle**

Matches the mockup's EN/ES segmented control (`NavShell.jsx`'s `LangToggle`) — swaps the current page's locale without changing the pathname.

```typescript
// src/components/language-toggle.tsx
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
```

- [ ] **Step 7: Protected-area layout — sidebar (desktop) + topbar + mobile drawer, per the mockup's `NavShell.jsx`**

This project's shadcn style (`base-nova`) builds `Sheet`/`Dialog` on
`@base-ui/react`, not Radix — use `SheetTrigger`'s `render` prop (as
shown below), not Radix's `asChild`; `asChild` doesn't exist on this
component and fails `tsc --noEmit` with `Property 'asChild' does not
exist`.

```typescript
// src/app/[locale]/(dashboard)/layout.tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { signOut, useSession } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
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
              render={<Button variant="ghost" size="icon" aria-label={tNav('menu')} className="md:hidden" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
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
```

> This links to five routes that don't have pages yet — that's expected. Each later plan creates its own `src/app/[locale]/(dashboard)/<feature>/page.tsx`. A 404 on those links until then is correct. `session.user.name`/`.email` are Better Auth's own core fields (not `additionalFields`), always present once `session` is non-null.

- [ ] **Step 8: Root redirect page (locale-aware)**

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

- [ ] **Step 9: Manual verification**

Run `npm run dev`. Signed out, visiting `/` redirects to `/es/sign-in`. Signed in, `/` redirects to `/es/dashboard` (404 page is expected/correct — no dashboard page exists yet). At desktop width, confirm the 240px sidebar renders with all five links (active link accent-tinted with a left border), the user chip (initials, name, email, sign-out button) sits in the sidebar footer, and the topbar shows the language toggle + theme toggle. Narrow the viewport below 768px and confirm the sidebar disappears, a hamburger button appears in the topbar, and clicking it slides in the same nav links + user chip as a drawer. Click the EN/ES toggle and confirm the whole app re-renders in the other language at the same route (e.g. `/es/dashboard` → `/en/dashboard`).

- [ ] **Step 10: Commit**

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
