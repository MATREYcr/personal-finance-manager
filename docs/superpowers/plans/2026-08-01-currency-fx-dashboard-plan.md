# Currency, FX & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build currency conversion, the daily FX-rate refresh cron, the multi-currency dashboard, and the base-currency setting — then verify the whole v1 system end-to-end.

**Architecture:** `src/lib/currency/` holds the pure conversion helper. `src/features/exchange-rates/` holds the FX fetch logic. `src/features/dashboard/` splits pure logic (period ranges, summary math — fully unit-tested) from a thin `'use cache'` query wrapper that talks to Prisma. `src/features/settings/` holds the base-currency action + form.

**Tech Stack:** Next.js 15, Prisma, Zod, next-intl, next-themes, Vitest, Vercel Cron.

**Branch:** `feature/currency-fx-dashboard`, created from `develop` **after** `feature/foundation` and `feature/transactions` are merged. (Does not require `feature/recurring-transactions` to be merged first — see the spec's dependency note — but if executing v1 subsystems strictly in sequence, it will be merged by the time this branch starts anyway.) PR target: `develop`. This is the last v1 subsystem — its final task verifies and closes out v1.

## Global Constraints

- Package manager is npm.
- Every Server Action validates input with Zod and scopes by the authenticated `userId`.
- The dashboard's cached query function must **not** take a `PrismaClient` (or any object) as a parameter — `'use cache'` requires serializable arguments, and a Prisma client instance is not serializable. Pure logic (period ranges, summary math) lives in separate, dependency-free modules that take plain data and are the only things unit-tested; the cached query wrapper itself imports `db` directly (same convention as every other `queries.ts` in this project) and is not unit-tested — it's covered by this plan's manual walkthrough instead.
- The FX refresh cron and the recurring-transaction generation cron (from the Recurring Transactions plan) both write data outside of `actions.ts` — each must call the relevant `revalidateTag` itself. This plan's FX cron must call **`revalidateTag('exchange-rates', { expire: 0 })`** on a successful refresh — in Next 16 `revalidateTag`'s single-arg form is deprecated and type-errors, and `{ expire: 0 }` (not `'max'`) is the documented pattern for an external cron trigger that needs the next request to see fresh rates immediately. It is a Route Handler, so `updateTag` is not usable here (it throws outside a Server Action).
- `vercel.json` may already exist (created by the Recurring Transactions plan) — if so, append the FX cron entry to its existing `crons` array rather than overwriting the file.
- All routes live under `src/app/[locale]/...`. All user-facing text uses `next-intl` (`useTranslations` in Client Components, `getTranslations` in Server Components) under this feature's own `Dashboard` and `Settings` namespaces — no hardcoded strings. All navigation (`useRouter`, `redirect`) imports from `@/i18n/navigation`, never `next/navigation`. All styling uses shadcn's theme-aware Tailwind tokens; where no semantic token exists (e.g. a positive/savings color), use an explicit `dark:` variant so it stays legible in both themes rather than hardcoding a single-theme color.
- `next.config.ts` has `cacheComponents: true` (enabled during Categories Task 3 for `'use cache'` queries). Every Server Component page that calls `getTranslations`/`useTranslations`/`getMessages` — `SettingsPage` in this plan — must call `setRequestLocale(locale)` itself before doing so; the root `[locale]/layout.tsx`'s call is not sufficient on its own. Skipping this doesn't just warn — it fails `npm run build` outright with "Uncached data was accessed outside of `<Suspense>`". `DashboardPage` doesn't call any next-intl server function directly (it only uses the locale-aware `redirect`, which takes `locale` as an explicit argument, not an ambient one) and is inherently dynamic anyway (it reads `headers()` for the session), so it does not need this call — but if a getTranslations call is ever added to it, add `setRequestLocale` too.

## Prerequisites (from Foundation + Transactions, already merged)

- `db`, `requireSession()`, `ExchangeRate` model, `User.baseCurrency` field.
- `getTransactions`-equivalent data already in the `Transaction` table (this plan queries `db.transaction` directly for aggregation, not through the Transactions feature's `queries.ts`, since it needs a different shape — see Task 4).
- `useSession()` at `@/lib/auth/client`; `useRouter`/`redirect` at `@/i18n/navigation`.
- `src/app/[locale]/(dashboard)/layout.tsx` nav already links to `/dashboard` and `/settings`.
- `.env.example` already documents `CRON_SECRET`.
- `messages/es.json` / `messages/en.json` already contain `Common`, `Auth`, `Categories`, `Transactions`, `RecurringTransactions` — this plan adds `Dashboard` and `Settings` namespaces.

---

## File Structure

```
src/lib/currency/{convert.ts,convert.test.ts}
src/features/exchange-rates/{fetch-rates.ts,fetch-rates.test.ts}
src/app/api/cron/fx-rates/route.ts
src/features/dashboard/
├── types.ts
├── period.ts
├── period.test.ts
├── compute-summary.ts
├── compute-summary.test.ts
├── queries.ts
└── components/{PeriodSwitcher.tsx,SummaryCards.tsx}
src/app/[locale]/(dashboard)/dashboard/page.tsx
src/features/settings/
├── actions.ts
├── actions.test.ts
└── components/BaseCurrencyForm.tsx
src/app/[locale]/(dashboard)/settings/page.tsx
vercel.json (append to)
README.md
```

---

### Task 1: Currency conversion helper

**Files:**
- Create: `src/lib/currency/convert.ts`
- Create: `src/lib/currency/convert.test.ts`

**Interfaces:**
- Produces: `PIVOT_CURRENCY`, `RateMap`, `convertAmount(amount, from, to, rates)` — consumed by Task 4 (dashboard).

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/currency/convert.test.ts
import { describe, it, expect } from 'vitest'
import { convertAmount } from './convert'

describe('convertAmount', () => {
  const rates = { EUR: 0.9, GBP: 0.75 } // relative to USD pivot

  it('returns the same amount when currencies match', () => {
    expect(convertAmount(100, 'USD', 'USD', rates)).toBe(100)
  })

  it('converts from the pivot currency to another', () => {
    expect(convertAmount(100, 'USD', 'EUR', rates)).toBeCloseTo(90)
  })

  it('converts from another currency to the pivot', () => {
    expect(convertAmount(90, 'EUR', 'USD', rates)).toBeCloseTo(100)
  })

  it('converts across two non-pivot currencies', () => {
    expect(convertAmount(90, 'EUR', 'GBP', rates)).toBeCloseTo(75)
  })

  it('throws when a required rate is missing', () => {
    expect(() => convertAmount(100, 'JPY', 'USD', rates)).toThrow(/JPY/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convert.test.ts`
Expected: FAIL — `Cannot find module './convert'`.

- [ ] **Step 3: Implement**

```typescript
// src/lib/currency/convert.ts
export const PIVOT_CURRENCY = 'USD'

export type RateMap = Record<string, number>

export function convertAmount(amount: number, from: string, to: string, rates: RateMap): number {
  if (from === to) return amount

  const rateFrom = from === PIVOT_CURRENCY ? 1 : rates[from]
  const rateTo = to === PIVOT_CURRENCY ? 1 : rates[to]

  if (rateFrom === undefined) throw new Error(`Missing exchange rate for currency: ${from}`)
  if (rateTo === undefined) throw new Error(`Missing exchange rate for currency: ${to}`)

  const amountInPivot = amount / rateFrom
  return amountInPivot * rateTo
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- convert.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(currency): add pivot-based currency conversion helper"
```

---

### Task 2: Exchange rate fetch cron

**Files:**
- Create: `src/features/exchange-rates/fetch-rates.ts`
- Create: `src/features/exchange-rates/fetch-rates.test.ts`
- Create: `src/app/api/cron/fx-rates/route.ts`
- Create or modify: `vercel.json`

**Interfaces:**
- Consumes: `db`, `PIVOT_CURRENCY` (Task 1).
- Produces: `refreshExchangeRates(db, fetchImpl)`, hit daily by Vercel Cron; populates `ExchangeRate` rows consumed by Task 4.

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/exchange-rates/fetch-rates.test.ts
import { describe, it, expect, vi } from 'vitest'
import { refreshExchangeRates } from './fetch-rates'

describe('refreshExchangeRates', () => {
  it('upserts one ExchangeRate row per currency returned by the API', async () => {
    const mockDb = { exchangeRate: { upsert: vi.fn() } } as any
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        base_code: 'USD',
        rates: { USD: 1, EUR: 0.9, GBP: 0.75 },
      }),
    })

    const result = await refreshExchangeRates(mockDb, mockFetch as unknown as typeof fetch)

    expect(result).toEqual({ updated: 2 }) // USD (the pivot) is skipped
    expect(mockDb.exchangeRate.upsert).toHaveBeenCalledWith({
      where: { targetCurrency: 'EUR' },
      create: { targetCurrency: 'EUR', rate: 0.9 },
      update: { rate: 0.9 },
    })
    expect(mockDb.exchangeRate.upsert).toHaveBeenCalledWith({
      where: { targetCurrency: 'GBP' },
      create: { targetCurrency: 'GBP', rate: 0.75 },
      update: { rate: 0.75 },
    })
  })

  it('does not throw and updates nothing when the API returns an error status', async () => {
    const mockDb = { exchangeRate: { upsert: vi.fn() } } as any
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })

    const result = await refreshExchangeRates(mockDb, mockFetch as unknown as typeof fetch)

    expect(result).toEqual({ updated: 0, error: expect.any(String) })
    expect(mockDb.exchangeRate.upsert).not.toHaveBeenCalled()
  })

  it('does not throw and updates nothing when the fetch itself rejects', async () => {
    const mockDb = { exchangeRate: { upsert: vi.fn() } } as any
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNRESET'))

    const result = await refreshExchangeRates(mockDb, mockFetch as unknown as typeof fetch)

    expect(result).toEqual({ updated: 0, error: 'ECONNRESET' })
    expect(mockDb.exchangeRate.upsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- fetch-rates.test.ts`
Expected: FAIL — `Cannot find module './fetch-rates'`.

- [ ] **Step 3: Implement**

The API used is `https://open.er-api.com/v6/latest/USD` — free, no API key, returns `{ result: "success", base_code: "USD", rates: { "<CODE>": number, ... } }` with `rates.USD === 1`.

```typescript
// src/features/exchange-rates/fetch-rates.ts
import type { PrismaClient } from '@prisma/client'
import { PIVOT_CURRENCY } from '@/lib/currency/convert'

const FX_API_URL = `https://open.er-api.com/v6/latest/${PIVOT_CURRENCY}`

interface FxApiResponse {
  result: string
  base_code: string
  rates: Record<string, number>
}

export async function refreshExchangeRates(
  db: PrismaClient,
  fetchImpl: typeof fetch = fetch
): Promise<{ updated: number; error?: string }> {
  let data: FxApiResponse
  try {
    // Wrap the network call + JSON parse: a rejected fetch (DNS failure,
    // timeout, connection reset) or malformed body must degrade to a graceful
    // { updated: 0, error } — the same contract as an HTTP-error response —
    // rather than propagating out and surfacing as an unhandled 500 from the
    // cron route. (A DB upsert failure below is intentionally NOT swallowed:
    // that's a real fault the cron should surface and retry on.)
    const response = await fetchImpl(FX_API_URL)
    if (!response.ok) {
      return { updated: 0, error: `FX API responded with status ${response.status}` }
    }
    data = (await response.json()) as FxApiResponse
  } catch (error) {
    return { updated: 0, error: error instanceof Error ? error.message : 'FX API request failed' }
  }

  if (data.result !== 'success') {
    return { updated: 0, error: `FX API returned result: ${data.result}` }
  }

  let updated = 0
  for (const [currency, rate] of Object.entries(data.rates)) {
    if (currency === PIVOT_CURRENCY) continue
    await db.exchangeRate.upsert({
      where: { targetCurrency: currency },
      create: { targetCurrency: currency, rate },
      update: { rate },
    })
    updated++
  }

  return { updated }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- fetch-rates.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Cron endpoint**

```typescript
// src/app/api/cron/fx-rates/route.ts
import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { refreshExchangeRates } from '@/features/exchange-rates/fetch-rates'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await refreshExchangeRates(db)
  if (result.updated > 0) {
    // revalidateTag (not updateTag — this is a Route Handler, not a Server
    // Action) requires a second argument in Next 16; the single-arg form is
    // deprecated and type-errors. `{ expire: 0 }` is the documented pattern for
    // external cron/webhook triggers that need fresh data on the next request.
    revalidateTag('exchange-rates', { expire: 0 })
  }
  return Response.json(result)
}
```

- [ ] **Step 6: Register the cron schedule**

If `vercel.json` doesn't exist yet, create it:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/fx-rates",
      "schedule": "0 6 * * *"
    }
  ]
}
```
If it already exists (e.g. Recurring Transactions merged first and added its own entry), add this object to the existing `crons` array instead of overwriting the file.

- [ ] **Step 7: Manual verification**

With `CRON_SECRET` set in `.env.local`, run `npm run dev`, then:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/fx-rates
```
Expected: `{"updated": <N>}` with N > 0. Confirm via `npx prisma studio` that `ExchangeRate` rows exist.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(fx): add daily exchange rate refresh cron job"
```

---

### Task 3: Settings — base currency

**Files:**
- Create: `src/features/settings/actions.ts`
- Create: `src/features/settings/actions.test.ts`
- Create: `src/features/settings/components/BaseCurrencyForm.tsx`
- Create: `src/app/[locale]/(dashboard)/settings/page.tsx`
- Modify: `messages/es.json`, `messages/en.json` (add the `Settings` namespace)

**Interfaces:**
- Consumes: `requireSession`, `db`, `useSession`.
- Produces: `updateBaseCurrency(currency)`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/settings/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted above top-level const declarations, so the
// mock objects they reference must be created via vi.hoisted() to avoid a
// "Cannot access before initialization" error.
const { mockRequireSession, mockDb } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockDb: { user: { update: vi.fn() } },
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))
vi.mock('@/lib/db', () => ({ db: mockDb }))

import { updateBaseCurrency } from './actions'

describe('updateBaseCurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('rejects non-3-letter currency codes', async () => {
    await expect(updateBaseCurrency('US')).rejects.toThrow()
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('updates the current user baseCurrency', async () => {
    await updateBaseCurrency('eur')

    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { baseCurrency: 'EUR' },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- settings/actions.test.ts`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 3: Implement**

```typescript
// src/features/settings/actions.ts
'use server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

const currencySchema = z.string().length(3)

export async function updateBaseCurrency(currency: string) {
  const session = await requireSession()
  const normalized = currencySchema.parse(currency).toUpperCase()

  await db.user.update({
    where: { id: session.user.id },
    data: { baseCurrency: normalized },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- settings/actions.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the Settings message keys**

```json
// messages/es.json — add a new top-level "Settings" namespace
  "Settings": {
    "title": "Configuración",
    "baseCurrency": "Moneda base",
    "saved": "Guardado"
  }
```

```json
// messages/en.json — add a new top-level "Settings" namespace
  "Settings": {
    "title": "Settings",
    "baseCurrency": "Base currency",
    "saved": "Saved"
  }
```

- [ ] **Step 6: Settings form**

```typescript
Shows a brief inline "Saved" confirmation next to the button after a
successful save, per the mockup's `Settings.jsx`, instead of the button
just returning to its resting state.

```typescript
// src/features/settings/components/BaseCurrencyForm.tsx
'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/auth/client'
import { updateBaseCurrency } from '../actions'

export function BaseCurrencyForm() {
  const t = useTranslations('Settings')
  const tCommon = useTranslations('Common.actions')
  const { data: session } = useSession()
  const router = useRouter()
  const [currency, setCurrency] = useState((session?.user as { baseCurrency?: string })?.baseCurrency ?? 'USD')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Auto-hide the "Saved" confirmation after a few seconds rather than leaving it on screen forever.
  useEffect(() => {
    if (!saved) return
    const timeout = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(timeout)
  }, [saved])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await updateBaseCurrency(currency)
    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xs">
      <label className="block text-sm font-medium">{t('baseCurrency')}</label>
      <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>{tCommon('save')}</Button>
        {saved && <span className="text-sm font-medium text-[var(--positive)]">{t('saved')}</span>}
      </div>
    </form>
  )
}
```

- [ ] **Step 7: Page**

```typescript
// src/app/[locale]/(dashboard)/settings/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BaseCurrencyForm } from '@/features/settings/components/BaseCurrencyForm'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // Required per-segment: the root layout's setRequestLocale isn't enough —
  // without this, Cache Components treats getTranslations as accessing
  // blocking runtime data and `npm run build` fails outright.
  setRequestLocale(locale)
  const t = await getTranslations('Settings')
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <BaseCurrencyForm />
    </div>
  )
}
```

- [ ] **Step 8: Manual verification**

Visit `/es/settings`, change the base currency to `EUR`, save, and confirm a green "Guardado" confirmation appears next to the button and fades after a few seconds. Switch to `/en/settings` and confirm the label/button/confirmation are in English. (Full effect on the dashboard is verified in Task 5, once it exists.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(settings): add base currency setting"
```

---

### Task 4: Dashboard aggregation query

**Files:**
- Create: `src/features/dashboard/types.ts`
- Create: `src/features/dashboard/period.ts`
- Create: `src/features/dashboard/period.test.ts`
- Create: `src/features/dashboard/compute-summary.ts`
- Create: `src/features/dashboard/compute-summary.test.ts`
- Create: `src/features/dashboard/queries.ts`

**Interfaces:**
- Consumes: `db`, `convertAmount`/`RateMap` (Task 1).
- Produces: `Period`, `getPeriodRange(period, reference?)`, `computeSummary(transactions, rates, baseCurrency)`, `getDashboardSummary(userId, period, baseCurrency, reference?)` — consumed by Task 5's UI.

`getPeriodRange` and `computeSummary` are plain, dependency-free functions and are the only things unit-tested here. `getDashboardSummary` is a thin `'use cache'`-tagged wrapper that fetches from `db` directly and delegates the math to `computeSummary` — it does not take `db` as a parameter (see Global Constraints).

- [ ] **Step 1: Domain types**

```typescript
// src/features/dashboard/types.ts
export type Period = 'week' | 'month' | 'year'

export interface DashboardSummary {
  income: number
  expense: number
  savings: number
}
```

- [ ] **Step 2: Write the failing test for the period ranges**

```typescript
// src/features/dashboard/period.test.ts
import { describe, it, expect } from 'vitest'
import { getPeriodRange } from './period'

describe('getPeriodRange', () => {
  it('returns the Monday-to-Monday week range', () => {
    // 2026-07-04 is a Saturday
    const { start, end } = getPeriodRange('week', new Date('2026-07-04T12:00:00Z'))
    expect(start.toISOString().slice(0, 10)).toBe('2026-06-29') // Monday
    expect(end.toISOString().slice(0, 10)).toBe('2026-07-06') // next Monday
  })

  it('returns the calendar month range', () => {
    const { start, end } = getPeriodRange('month', new Date('2026-07-15T12:00:00Z'))
    expect(start.toISOString().slice(0, 10)).toBe('2026-07-01')
    expect(end.toISOString().slice(0, 10)).toBe('2026-08-01')
  })

  it('returns the calendar year range', () => {
    const { start, end } = getPeriodRange('year', new Date('2026-07-15T12:00:00Z'))
    expect(start.toISOString().slice(0, 10)).toBe('2026-01-01')
    expect(end.toISOString().slice(0, 10)).toBe('2027-01-01')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- dashboard/period.test.ts`
Expected: FAIL — `Cannot find module './period'`.

- [ ] **Step 4: Implement getPeriodRange**

```typescript
// src/features/dashboard/period.ts
import type { Period } from './types'

export function getPeriodRange(period: Period, reference: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(reference)
  const end = new Date(reference)

  if (period === 'week') {
    const day = start.getUTCDay()
    const diffToMonday = (day + 6) % 7
    start.setUTCDate(start.getUTCDate() - diffToMonday)
    start.setUTCHours(0, 0, 0, 0)
    end.setTime(start.getTime())
    end.setUTCDate(end.getUTCDate() + 7)
  } else if (period === 'month') {
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    end.setTime(start.getTime())
    end.setUTCMonth(end.getUTCMonth() + 1)
  } else {
    start.setUTCMonth(0, 1)
    start.setUTCHours(0, 0, 0, 0)
    end.setTime(start.getTime())
    end.setUTCFullYear(end.getUTCFullYear() + 1)
  }

  return { start, end }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- dashboard/period.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Write the failing test for the pure summary computation**

```typescript
// src/features/dashboard/compute-summary.test.ts
import { describe, it, expect } from 'vitest'
import { computeSummary } from './compute-summary'

describe('computeSummary', () => {
  it('sums income and expense converted to the base currency', () => {
    const transactions = [
      { type: 'INCOME' as const, amount: 1000, currency: 'USD' },
      { type: 'EXPENSE' as const, amount: 90, currency: 'EUR' }, // -> 100 USD at rate 0.9
    ]
    const rates = { EUR: 0.9 }

    const summary = computeSummary(transactions, rates, 'USD')

    expect(summary.income).toBeCloseTo(1000)
    expect(summary.expense).toBeCloseTo(100)
    expect(summary.savings).toBeCloseTo(900)
  })

  it('returns zeroes for an empty transaction list', () => {
    expect(computeSummary([], {}, 'USD')).toEqual({ income: 0, expense: 0, savings: 0 })
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- dashboard/compute-summary.test.ts`
Expected: FAIL — `Cannot find module './compute-summary'`.

- [ ] **Step 8: Implement computeSummary**

```typescript
// src/features/dashboard/compute-summary.ts
import { convertAmount, type RateMap } from '@/lib/currency/convert'
import type { DashboardSummary } from './types'

export interface SummarizableTransaction {
  type: 'EXPENSE' | 'INCOME'
  amount: number
  currency: string
}

export function computeSummary(
  transactions: SummarizableTransaction[],
  rates: RateMap,
  baseCurrency: string
): DashboardSummary {
  let income = 0
  let expense = 0

  for (const tx of transactions) {
    const converted = convertAmount(Number(tx.amount), tx.currency, baseCurrency, rates)
    if (tx.type === 'INCOME') income += converted
    else expense += converted
  }

  return { income, expense, savings: income - expense }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- dashboard/compute-summary.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Write the cached query wrapper (not unit-tested — covered by Task 5's manual walkthrough)**

```typescript
// src/features/dashboard/queries.ts
'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import type { RateMap } from '@/lib/currency/convert'
import { getPeriodRange } from './period'
import { computeSummary } from './compute-summary'
import type { Period, DashboardSummary } from './types'

export async function getDashboardSummary(
  userId: string,
  period: Period,
  baseCurrency: string,
  reference: Date = new Date()
): Promise<DashboardSummary> {
  cacheTag('transactions')
  cacheTag('exchange-rates')

  const { start, end } = getPeriodRange(period, reference)

  const [transactions, rateRows] = await Promise.all([
    db.transaction.findMany({ where: { userId, date: { gte: start, lt: end } } }),
    db.exchangeRate.findMany(),
  ])

  const rates: RateMap = Object.fromEntries(rateRows.map((r) => [r.targetCurrency, Number(r.rate)]))

  return computeSummary(
    transactions.map((tx) => ({ type: tx.type, amount: Number(tx.amount), currency: tx.currency })),
    rates,
    baseCurrency
  )
}
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add period-aware, currency-converted summary query"
```

---

### Task 5: Dashboard UI

**Files:**
- Create: `src/features/dashboard/components/PeriodSwitcher.tsx`
- Create: `src/features/dashboard/components/SummaryCards.tsx`
- Create: `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- Modify: `messages/es.json`, `messages/en.json` (add the `Dashboard` namespace)

**Interfaces:**
- Consumes: `getDashboardSummary`/`Period` (Task 4), `auth`/`headers` (Foundation), `redirect` (`@/i18n/navigation`).
- Produces: the `/dashboard` page.

- [ ] **Step 1: Add the Dashboard message keys**

```json
// messages/es.json — add a new top-level "Dashboard" namespace
  "Dashboard": {
    "week": "Semana",
    "month": "Mes",
    "year": "Año",
    "income": "Ingresos",
    "expense": "Gastos",
    "savings": "Ahorro"
  }
```

```json
// messages/en.json — add a new top-level "Dashboard" namespace
  "Dashboard": {
    "week": "Week",
    "month": "Month",
    "year": "Year",
    "income": "Income",
    "expense": "Expense",
    "savings": "Savings"
  }
```

- [ ] **Step 2: Period switcher (URL-driven — no client state library needed)**

```typescript
// src/features/dashboard/components/PeriodSwitcher.tsx
'use client'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Period } from '../types'

export function PeriodSwitcher({ period }: { period: Period }) {
  const t = useTranslations('Dashboard')
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Tabs value={period} onValueChange={(v) => router.push(`${pathname}?period=${v}`)}>
      <TabsList>
        <TabsTrigger value="week">{t('week')}</TabsTrigger>
        <TabsTrigger value="month">{t('month')}</TabsTrigger>
        <TabsTrigger value="year">{t('year')}</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
```

- [ ] **Step 3: Summary cards**

Savings has no built-in shadcn semantic token for "positive" — `text-destructive` already covers the negative case in both themes, but the positive case needs an explicit light/dark pair rather than a single hardcoded color:

```typescript
// src/features/dashboard/components/SummaryCards.tsx
import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { DashboardSummary } from '../types'

export function SummaryCards({ summary, baseCurrency }: { summary: DashboardSummary; baseCurrency: string }) {
  const t = useTranslations('Dashboard')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>{t('income')}</CardTitle></CardHeader>
        <CardContent className="tabular-nums text-2xl font-semibold text-[var(--positive)]">
          {summary.income.toFixed(2)} {baseCurrency}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('expense')}</CardTitle></CardHeader>
        <CardContent className="tabular-nums text-2xl font-semibold text-destructive">
          {summary.expense.toFixed(2)} {baseCurrency}
        </CardContent>
      </Card>
      {/* Savings gets a subtle accent-tinted border per the mockup, distinguishing it as the headline figure */}
      <Card className="border-primary/30">
        <CardHeader><CardTitle>{t('savings')}</CardTitle></CardHeader>
        <CardContent
          className={`tabular-nums text-2xl font-semibold ${
            summary.savings >= 0 ? 'text-[var(--positive)]' : 'text-destructive'
          }`}
        >
          {summary.savings.toFixed(2)} {baseCurrency}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Dashboard page (Server Component — no TanStack Query, per the "Server Components fetch directly" rule)**

```typescript
// src/app/[locale]/(dashboard)/dashboard/page.tsx
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { getDashboardSummary } from '@/features/dashboard/queries'
import { PeriodSwitcher } from '@/features/dashboard/components/PeriodSwitcher'
import { SummaryCards } from '@/features/dashboard/components/SummaryCards'
import type { Period } from '@/features/dashboard/types'

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ period?: string }>
}) {
  const { locale } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect({ href: '/sign-in', locale })

  const { period: rawPeriod } = await searchParams
  const period: Period = rawPeriod === 'week' || rawPeriod === 'year' ? rawPeriod : 'month'

  const summary = await getDashboardSummary(
    session.user.id,
    period,
    (session.user as { baseCurrency: string }).baseCurrency
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PeriodSwitcher period={period} />
      <SummaryCards summary={summary} baseCurrency={(session.user as { baseCurrency: string }).baseCurrency} />
    </div>
  )
}
```

- [ ] **Step 5: Manual verification**

Run `npm run dev`. `/es/dashboard` shows Income/Expense/Savings (translated) for the current month — Income in the positive/green tone, Expense in the destructive/red tone, and the Savings card with a visible accent-tinted border and its own positive/negative coloring depending on sign. Switching period tabs updates the numbers. Add a transaction, revisit dashboard, confirm totals reflect it. Change base currency in `/es/settings`, confirm dashboard values and suffix update. Switch to `/en/dashboard` and confirm full English rendering. Toggle dark mode and confirm every figure and the Savings card border stay legible in both a positive and a negative state.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(dashboard): build dashboard UI with period switcher"
```

---

### Task 6: Full v1 integration pass

By this point Foundation, Categories, Transactions, Recurring Transactions, and this subsystem are all merged (or, if executed out of strict order, at least Foundation + Transactions + this subsystem — note in the walkthrough below if Recurring isn't merged yet and skip that portion).

**Files:**
- Modify: `README.md` (create if absent)

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```
Expected: all tests pass across every subsystem (categories, transactions, recurring-transactions, currency conversion, exchange rates, dashboard, settings).

- [ ] **Step 2: Full manual walkthrough**

With `npm run dev` running: sign up a fresh account at `/es/sign-up` → confirm 9 seeded categories → add a few income/expense transactions in USD and one other currency → create a monthly recurring salary rule (if Recurring Transactions is merged) → hit both cron endpoints manually with `curl` → confirm the dashboard's week/month/year totals and savings figure are correct and currency-converted → edit the base currency in Settings and confirm the dashboard updates → attempt to delete a category with transactions and confirm the friendly error → switch to `/en/...` throughout and confirm every page renders fully in English → toggle dark mode and confirm every page (including the destructive/positive savings colors and status badges) stays legible.

- [ ] **Step 3: Document setup in README**

```markdown
# Personal Finance Manager

Personal expense/income tracker with per-user categories, recurring
transactions, and a multi-currency dashboard. Available in Spanish
(default) and English, with light/dark mode.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` from a Supabase project (Project Settings → Database)
   - `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
   - `CRON_SECRET` (any random string, 16+ characters)
3. `npx prisma migrate deploy`
4. `npm run dev`

## Internationalization

Routes are locale-prefixed (`/es/...`, `/en/...`), Spanish is the default.
Message catalogs live in `messages/es.json` and `messages/en.json`, one
top-level namespace per feature (`Common`, `Auth`, `Categories`,
`Transactions`, `RecurringTransactions`, `Dashboard`, `Settings`).

## Cron jobs (production, via `vercel.json`)

- `/api/cron/fx-rates` — daily FX rate refresh
- `/api/cron/recurring-transactions` — daily recurring transaction generation

## v1 subsystems

Built as five sequential branches, each with its own spec + plan under
`docs/superpowers/`: Foundation → Categories → Transactions → Recurring
Transactions → Currency/FX/Dashboard.

## Phase 2

A Telegram bot (Vercel AI SDK) for natural-language transaction entry is
planned separately as its own spec once this v1 is stable.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: add project README with setup and cron instructions"
```

- [ ] **Step 5: Push and open the final PR**

```bash
git push -u origin feature/currency-fx-dashboard
gh pr create --base develop --title "Currency, FX & Dashboard (closes v1)" --body "Implements docs/superpowers/specs/2026-08-01-currency-fx-dashboard-design.md. Depends on feature/foundation and feature/transactions already merged. This is the last of the five v1 subsystem branches — merging this completes v1."
```
