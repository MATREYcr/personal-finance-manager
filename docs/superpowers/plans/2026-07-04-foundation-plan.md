# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js scaffold, Supabase/Prisma datasource, the complete domain schema, Better Auth, and a protected app shell — the shared foundation every later feature branch builds on.

**Architecture:** Next.js 15 App Router, single deployable app. `src/features/<domain>/` holds business logic (populated by later plans); this plan only creates shared infrastructure (`src/lib/`, `prisma/schema.prisma`, `src/middleware.ts`, the root and dashboard-group layouts).

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS + shadcn/ui, Prisma ORM, Supabase Postgres, Better Auth, TanStack Query, Vitest, npm.

**Branch:** `feature/foundation` (already checked out). PR target: `develop`. This is the first of five subsystem branches for v1 — no other subsystem branches should exist yet.

## Global Constraints

- Package manager is npm for every command in this plan — do not substitute pnpm/yarn.
- `app/` contains only Next.js routing files (`page.tsx`, `layout.tsx`, `route.ts`). All business logic lives under `src/features/<domain>/` (created by later plans).
- All UI must be responsive/mobile-first (`w-full`, `max-w-*`, `sm:`/`md:`/`lg:` breakpoints — never fixed pixel widths).
- This plan does not implement any business feature (no category/transaction CRUD, no dashboard). Its only job is scaffold + schema + auth + shell.

---

## File Structure

```
personal-finance-manager/
├── prisma/{schema.prisma,migrations/}
├── src/
│   ├── app/
│   │   ├── api/auth/[...all]/route.ts
│   │   ├── (auth)/{sign-in/page.tsx,sign-up/page.tsx}
│   │   ├── (dashboard)/layout.tsx        ← empty feature pages added by later plans
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/ui/                    ← shadcn/ui components
│   ├── lib/
│   │   ├── auth/{index.ts,client.ts,session.ts}
│   │   ├── db/index.ts
│   │   └── query/{client.tsx,keys.ts}
│   └── middleware.ts
├── vercel.json                            ← created here empty-ish, appended to by later cron-adding plans
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
- Produces: a running `npm run dev` app, `npm test` running Vitest, shadcn's `cn()` util at `src/lib/utils.ts`.

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

### Task 3: Better Auth setup

**Files:**
- Create: `src/lib/auth/index.ts`
- Create: `src/lib/auth/client.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/app/(auth)/sign-in/page.tsx`
- Create: `src/app/(auth)/sign-up/page.tsx`
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

> The Categories plan will extend this file with a `databaseHooks.user.create.after` hook to seed default categories on signup — that's out of scope here, but leave `betterAuth({...})` as a single exported config object so that later addition is a small, additive edit.

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
    throw new Error('Not authenticated')
  }
  return session
}
```

- [ ] **Step 5: Wire the Better Auth API route**

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

- [ ] **Step 8: Add the route-protection middleware**

```typescript
// src/middleware.ts
import { betterFetch } from '@better-fetch/fetch'
import type { Session } from 'better-auth/types'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = [
  '/dashboard',
  '/categories',
  '/transactions',
  '/recurring-transactions',
  '/settings',
]

export default async function middleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>('/api/auth/get-session', {
    baseURL: request.nextUrl.origin,
    headers: { cookie: request.headers.get('cookie') ?? '' },
  })

  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\\..*|_next|api/auth).*)', '/'],
}
```

`betterFetch` ships as a transitive dependency of `better-auth`; if the import fails, run `npm install @better-fetch/fetch`.

- [ ] **Step 9: Sign-in page**

```typescript
// src/app/(auth)/sign-in/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: signInError } = await signIn.email({ email, password })
    if (signInError) {
      setError(signInError.message ?? 'Could not sign in')
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 10: Sign-up page**

```typescript
// src/app/(auth)/sign-up/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpPage() {
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
      setError(signUpError.message ?? 'Could not sign up')
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign up</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 11: Manual verification**

Run `npm run dev`, visit `/sign-up`, create an account, confirm redirect to a `/dashboard` URL (a 404 is expected there until Task 5 adds the layout/pages — confirm you're not bounced back to `/sign-in`).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(auth): add Better Auth email/password sign-in and sign-up"
```

---

### Task 4: Domain Prisma models (full schema for all v1 subsystems)

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

Find `model User { ... }` (generated in Task 3) and add these three lines inside it, alongside `sessions`/`accounts`:

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

### Task 5: TanStack Query provider, shared query keys, and protected app shell

**Files:**
- Create: `src/lib/query/client.tsx`
- Create: `src/lib/query/keys.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/page.tsx`

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

Wrap `{children}` in `src/app/layout.tsx`'s root layout with `<QueryProvider>`.

- [ ] **Step 3: Shared query keys file (later plans add to this, not replace it)**

```typescript
// src/lib/query/keys.ts
export const queryKeys = {
  // Later plans append their own top-level key here, e.g.:
  // categories: { all: ['categories'] as const },
  // transactions: { all: [...], list: (filters) => [...] },
  // recurringTransactions: { all: [...] },
}
```

- [ ] **Step 4: Protected-area layout with navigation**

```typescript
// src/app/(dashboard)/layout.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/categories', label: 'Categories' },
  { href: '/recurring-transactions', label: 'Recurring' },
  { href: '/settings', label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
        <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
      </nav>
      <main className="flex-1 w-full">{children}</main>
    </div>
  )
}
```

> This links to five routes that don't have pages yet — that's expected. Each later plan creates its own `src/app/(dashboard)/<feature>/page.tsx`. A 404 on those links until then is correct.

- [ ] **Step 5: Root redirect page**

```typescript
// src/app/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 6: Manual verification**

Run `npm run dev`. Signed out, visiting `/` redirects to `/sign-in`. Signed in, `/` redirects to `/dashboard` (404 page is expected/correct — no dashboard page exists yet), and the nav bar renders with all five links and a working Sign out button.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(shell): add TanStack Query provider, shared query keys, and protected nav shell"
```

---

### Task 6: Open the PR to develop

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```
Expected: passes (only the scaffold sanity — no feature tests exist yet in this plan).

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feature/foundation
gh pr create --base develop --title "Foundation: scaffold, auth, domain schema, app shell" --body "Implements docs/superpowers/specs/2026-07-04-foundation-design.md. Every later v1 subsystem branch (Categories, Transactions, Recurring Transactions, Currency/FX/Dashboard) depends on this being merged first."
```
