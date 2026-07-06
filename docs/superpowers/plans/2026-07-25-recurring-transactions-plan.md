# Recurring Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CRUD for recurring transaction rules and a daily cron job that materializes due rules into real transactions, atomically and idempotently.

**Architecture:** `src/features/recurring-transactions/` holds queries.ts, actions.ts, generate.ts (the cron's pure-ish logic), hooks/, components/.

**Tech Stack:** Next.js 15, Prisma, Zod, TanStack Query, react-hook-form, shadcn/ui, next-intl, Vitest, Vercel Cron.

**Branch:** `feature/recurring-transactions`, created from `develop` **after** `feature/transactions` is merged. PR target: `develop`.

## Global Constraints

- Package manager is npm.
- Every Server Action validates input with Zod and scopes by the authenticated `userId`.
- `queries.ts` uses `'use cache'` + `cacheTag('recurring-transactions')`; `actions.ts` mutations call `revalidateTag('recurring-transactions')` after a successful write.
- Editing a `RecurringTransaction` must never touch already-generated `Transaction` rows, and must never touch `nextRunDate` (only the generation cron advances that field).
- The generation cron must invalidate the `'transactions'` and `'recurring-transactions'` cache tags itself (it writes via `db` directly, bypassing `actions.ts`, so the `revalidateTag` calls that `actions.ts` would normally make must happen in the cron route instead).
- Per-rule generation (create `Transaction` + advance `nextRunDate`) must be atomic (`db.$transaction`) so a retry after partial failure never double-creates or skips.
- All routes live under `src/app/[locale]/...`. All user-facing text uses `next-intl` (`useTranslations` in Client Components) under this feature's own `RecurringTransactions` namespace — no hardcoded strings. All styling uses shadcn's theme-aware Tailwind tokens (never hardcoded colors).

## Prerequisites (from Foundation + Categories + Transactions, already merged)

- `db`, `requireSession()`, `RecurringTransaction` model, `TransactionType`/`RecurrenceFrequency` enums.
- `queryKeys` at `@/lib/query/keys` (this plan adds a `recurringTransactions` key).
- `useCategories()` hook and `Category` type from the Categories feature; the `Categories` namespace already provides `typeExpense`/`typeIncome` labels.
- `src/app/[locale]/(dashboard)/layout.tsx` nav already links to `/recurring-transactions`.
- `.env.example` already documents `CRON_SECRET` (added in Foundation) — set a real value in `.env.local` before testing the cron endpoint in this plan.
- `vercel.json` does not exist yet in this codebase unless a prior plan created it — if absent, create it in Task 3 of this plan; if present (e.g. from a differently-ordered execution), append to its `crons` array instead of overwriting it.
- `messages/es.json` / `messages/en.json` already contain `Common`, `Auth`, `Categories`, `Transactions` — this plan adds a new top-level `RecurringTransactions` namespace.
- shadcn components already installed (button, input, label, card, dialog, table, select, tabs, badge, alert, sheet — no `form`, this project uses `react-hook-form` directly rather than shadcn's `Form` wrapper) and `lucide-react` is available for row-action icons.

---

## File Structure

```
src/features/recurring-transactions/
├── types.ts
├── queries.ts
├── actions.ts
├── actions.test.ts
├── generate.ts
├── generate.test.ts
├── hooks/{useRecurringTransactions.ts,useRecurringTransactionMutations.ts}
└── components/{RecurringTransactionFormDialog.tsx,RecurringTransactionList.tsx}
src/app/api/recurring-transactions/route.ts
src/app/api/cron/recurring-transactions/route.ts
src/app/[locale]/(dashboard)/recurring-transactions/page.tsx
```

---

### Task 1: Recurring transactions queries and actions

**Files:**
- Create: `src/features/recurring-transactions/types.ts`
- Create: `src/features/recurring-transactions/queries.ts`
- Create: `src/features/recurring-transactions/actions.ts`
- Create: `src/features/recurring-transactions/actions.test.ts`
- Modify: `src/lib/query/keys.ts` (add the `recurringTransactions` key)

**Interfaces:**
- Consumes: `requireSession`, `db`, `RecurringTransaction`/`RecurrenceFrequency` from `@prisma/client`.
- Produces: `getRecurringTransactions(userId)`, `createRecurringTransaction(input)`, `updateRecurringTransaction(input)`, `setRecurringTransactionActive(id, active)`, `deleteRecurringTransaction(id)` — consumed by Task 2's UI.

- [ ] **Step 1: Add the recurringTransactions key to the shared query keys file**

```typescript
// src/lib/query/keys.ts (add alongside categories/transactions)
  recurringTransactions: {
    all: ['recurring-transactions'] as const,
  },
```

- [ ] **Step 2: Domain types**

```typescript
// src/features/recurring-transactions/types.ts
import type { RecurringTransaction, Category } from '@prisma/client'

export type RecurringTransactionWithCategory = RecurringTransaction & { category: Category }
```

- [ ] **Step 3: Write the failing test**

```typescript
// src/features/recurring-transactions/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRequireSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))

const mockDb = {
  recurringTransaction: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  category: { findFirst: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { createRecurringTransaction } from './actions'

describe('createRecurringTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockDb.category.findFirst.mockResolvedValue({ id: 'cat-1' })
  })

  it('sets nextRunDate to the provided start date', async () => {
    mockDb.recurringTransaction.create.mockResolvedValue({ id: 'rec-1' })

    await createRecurringTransaction({
      categoryId: 'cat-1',
      type: 'INCOME',
      amount: 3000,
      currency: 'USD',
      frequency: 'MONTHLY',
      startDate: '2026-08-01',
    })

    expect(mockDb.recurringTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'cat-1',
        type: 'INCOME',
        amount: 3000,
        currency: 'USD',
        frequency: 'MONTHLY',
        nextRunDate: new Date('2026-08-01'),
        note: undefined,
        active: true,
      },
    })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- recurring-transactions/actions.test.ts`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 5: Write queries.ts**

```typescript
// src/features/recurring-transactions/queries.ts
'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getRecurringTransactions(userId: string) {
  cacheTag('recurring-transactions')
  return db.recurringTransaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { nextRunDate: 'asc' },
  })
}
```

- [ ] **Step 6: Write actions.ts**

```typescript
// src/features/recurring-transactions/actions.ts
'use server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

const recurringInputSchema = z.object({
  categoryId: z.string().min(1),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().min(1),
  note: z.string().max(280).optional(),
})

async function assertOwnsCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({ where: { id: categoryId, userId } })
  if (!category) throw new Error('That category does not exist for this user')
}

// Note: the category-ownership error below is a defensive/should-never-happen
// case (the UI only ever offers the current user's own categories in the
// select), not a user-facing validation message, so it is intentionally not
// translated — same rationale as the Transactions plan's identical check.
export async function createRecurringTransaction(input: z.infer<typeof recurringInputSchema>) {
  const session = await requireSession()
  const { categoryId, type, amount, currency, frequency, startDate, note } = recurringInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  const rule = await db.recurringTransaction.create({
    data: {
      userId: session.user.id,
      categoryId,
      type,
      amount,
      currency,
      frequency,
      nextRunDate: new Date(startDate),
      note,
      active: true,
    },
  })

  revalidateTag('recurring-transactions')
  return rule
}

const updateRecurringInputSchema = recurringInputSchema.extend({ id: z.string().min(1) })

export async function updateRecurringTransaction(input: z.infer<typeof updateRecurringInputSchema>) {
  const session = await requireSession()
  const { id, categoryId, type, amount, currency, frequency, note } = updateRecurringInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  // Intentionally does not touch nextRunDate — editing a rule must never
  // retroactively affect already-generated transactions or skip/duplicate the next run.
  const rule = await db.recurringTransaction.update({
    where: { id, userId: session.user.id },
    data: { categoryId, type, amount, currency, frequency, note },
  })

  revalidateTag('recurring-transactions')
  return rule
}

export async function setRecurringTransactionActive(id: string, active: boolean) {
  const session = await requireSession()
  const rule = await db.recurringTransaction.update({
    where: { id, userId: session.user.id },
    data: { active },
  })
  revalidateTag('recurring-transactions')
  return rule
}

export async function deleteRecurringTransaction(id: string) {
  const session = await requireSession()
  await db.recurringTransaction.delete({ where: { id, userId: session.user.id } })
  revalidateTag('recurring-transactions')
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- recurring-transactions/actions.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(recurring): add CRUD queries/actions for recurring transactions"
```

---

### Task 2: Recurring transactions UI

**Files:**
- Create: `src/app/api/recurring-transactions/route.ts`
- Create: `src/features/recurring-transactions/hooks/useRecurringTransactions.ts`
- Create: `src/features/recurring-transactions/hooks/useRecurringTransactionMutations.ts`
- Create: `src/features/recurring-transactions/components/RecurringTransactionFormDialog.tsx`
- Create: `src/features/recurring-transactions/components/RecurringTransactionList.tsx`
- Create: `src/app/[locale]/(dashboard)/recurring-transactions/page.tsx`
- Modify: `messages/es.json`, `messages/en.json` (add the `RecurringTransactions` namespace)

**Interfaces:**
- Consumes: everything from Task 1, plus `useCategories` (Categories plan).
- Produces: a working `/recurring-transactions` page.

- [ ] **Step 1: API route**

```typescript
// src/app/api/recurring-transactions/route.ts
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getRecurringTransactions } from '@/features/recurring-transactions/queries'

export async function GET() {
  const session = await requireSession()
  const rules = await getRecurringTransactions(session.user.id)
  return NextResponse.json(rules)
}
```

- [ ] **Step 2: Query hook**

```typescript
// src/features/recurring-transactions/hooks/useRecurringTransactions.ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'

export function useRecurringTransactions() {
  return useQuery({
    queryKey: queryKeys.recurringTransactions.all,
    queryFn: async () => {
      const res = await fetch('/api/recurring-transactions')
      if (!res.ok) throw new Error('Failed to load recurring transactions')
      return res.json()
    },
  })
}
```

- [ ] **Step 3: Mutation hooks**

```typescript
// src/features/recurring-transactions/hooks/useRecurringTransactionMutations.ts
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  setRecurringTransactionActive,
  deleteRecurringTransaction,
} from '../actions'

export function useRecurringTransactionMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.recurringTransactions.all })

  return {
    create: useMutation({ mutationFn: createRecurringTransaction, onSuccess: invalidate }),
    update: useMutation({ mutationFn: updateRecurringTransaction, onSuccess: invalidate }),
    toggleActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) => setRecurringTransactionActive(id, active),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteRecurringTransaction, onSuccess: invalidate }),
  }
}
```

- [ ] **Step 4: Add the RecurringTransactions message keys**

```json
// messages/es.json — add a new top-level "RecurringTransactions" namespace
  "RecurringTransactions": {
    "title": "Transacciones recurrentes",
    "new": "Nueva transacción recurrente",
    "edit": "Editar transacción recurrente",
    "loading": "Cargando transacciones recurrentes…",
    "frequency": "Frecuencia",
    "frequencyWeekly": "Semanal",
    "frequencyMonthly": "Mensual",
    "frequencyYearly": "Anual",
    "startDate": "Fecha de inicio",
    "columnCategory": "Categoría",
    "columnType": "Tipo",
    "columnAmount": "Monto",
    "columnFrequency": "Frecuencia",
    "columnNextRun": "Próxima fecha",
    "columnStatus": "Estado",
    "columnActions": "Acciones",
    "statusActive": "Activa",
    "statusPaused": "Pausada",
    "pause": "Pausar",
    "resume": "Reanudar"
  }
```

```json
// messages/en.json — add a new top-level "RecurringTransactions" namespace
  "RecurringTransactions": {
    "title": "Recurring transactions",
    "new": "New recurring transaction",
    "edit": "Edit recurring transaction",
    "loading": "Loading recurring transactions…",
    "frequency": "Frequency",
    "frequencyWeekly": "Weekly",
    "frequencyMonthly": "Monthly",
    "frequencyYearly": "Yearly",
    "startDate": "Start date",
    "columnCategory": "Category",
    "columnType": "Type",
    "columnAmount": "Amount",
    "columnFrequency": "Frequency",
    "columnNextRun": "Next run",
    "columnStatus": "Status",
    "columnActions": "Actions",
    "statusActive": "Active",
    "statusPaused": "Paused",
    "pause": "Pause",
    "resume": "Resume"
  }
```

- [ ] **Step 5: Form dialog**

```typescript
// src/features/recurring-transactions/components/RecurringTransactionFormDialog.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useRecurringTransactionMutations } from '../hooks/useRecurringTransactionMutations'
import type { RecurringTransactionWithCategory } from '../types'
import type { Category } from '@/features/categories/types'

const schema = z.object({
  categoryId: z.string().min(1, 'Required'),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.coerce.number().positive('Must be greater than 0'),
  currency: z.string().min(3).max(3),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().min(1, 'Required'),
  note: z.string().max(280).optional(),
})
type FormValues = z.infer<typeof schema>

export function RecurringTransactionFormDialog({
  rule,
  trigger,
}: {
  rule?: RecurringTransactionWithCategory
  trigger: React.ReactNode
}) {
  const t = useTranslations('RecurringTransactions')
  const tTransactions = useTranslations('Transactions')
  const tCategories = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { data: categories } = useCategories()
  const { create, update } = useRecurringTransactionMutations()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: rule?.categoryId ?? '',
      type: rule?.type ?? 'EXPENSE',
      amount: rule ? Number(rule.amount) : 0,
      currency: rule?.currency ?? 'USD',
      frequency: rule?.frequency ?? 'MONTHLY',
      startDate: rule ? rule.nextRunDate.toString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      note: rule?.note ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    if (rule) {
      await update.mutateAsync({ id: rule.id, ...values })
    } else {
      await create.mutateAsync(values)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? t('edit') : t('new')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Select defaultValue={form.getValues('type')} onValueChange={(v) => form.setValue('type', v as 'EXPENSE' | 'INCOME')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">{tCategories('typeExpense')}</SelectItem>
              <SelectItem value="INCOME">{tCategories('typeIncome')}</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue={form.getValues('categoryId')} onValueChange={(v) => form.setValue('categoryId', v)}>
            <SelectTrigger><SelectValue placeholder={tTransactions('categoryPlaceholder')} /></SelectTrigger>
            <SelectContent>
              {(categories as Category[] | undefined)?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" placeholder={tTransactions('amount')} {...form.register('amount')} />
          <Input placeholder={tTransactions('currency')} maxLength={3} {...form.register('currency')} />
          <Select defaultValue={form.getValues('frequency')} onValueChange={(v) => form.setValue('frequency', v as 'WEEKLY' | 'MONTHLY' | 'YEARLY')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">{t('frequencyWeekly')}</SelectItem>
              <SelectItem value="MONTHLY">{t('frequencyMonthly')}</SelectItem>
              <SelectItem value="YEARLY">{t('frequencyYearly')}</SelectItem>
            </SelectContent>
          </Select>
          {!rule && <Input type="date" placeholder={t('startDate')} {...form.register('startDate')} />}
          <Input placeholder={tTransactions('note')} {...form.register('note')} />
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || update.isPending}>{tCommon('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6: List**

```typescript
// src/features/recurring-transactions/components/RecurringTransactionList.tsx
'use client'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useRecurringTransactions } from '../hooks/useRecurringTransactions'
import { useRecurringTransactionMutations } from '../hooks/useRecurringTransactionMutations'
import { RecurringTransactionFormDialog } from './RecurringTransactionFormDialog'
import type { RecurringTransactionWithCategory } from '../types'

const frequencyKey = { WEEKLY: 'frequencyWeekly', MONTHLY: 'frequencyMonthly', YEARLY: 'frequencyYearly' } as const

export function RecurringTransactionList() {
  const t = useTranslations('RecurringTransactions')
  const tCategories = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { data: rules, isLoading } = useRecurringTransactions()
  const { toggleActive, remove } = useRecurringTransactionMutations()

  if (isLoading) return <p>{t('loading')}</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecurringTransactionFormDialog trigger={<Button>{t('new')}</Button>} />
      </div>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnCategory')}</TableHead>
              <TableHead>{t('columnType')}</TableHead>
              <TableHead className="text-right">{t('columnAmount')}</TableHead>
              <TableHead>{t('columnFrequency')}</TableHead>
              <TableHead>{t('columnNextRun')}</TableHead>
              <TableHead>{t('columnStatus')}</TableHead>
              <TableHead className="text-right">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rules as RecurringTransactionWithCategory[] | undefined)?.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.category.name}</TableCell>
                <TableCell>{rule.type === 'EXPENSE' ? tCategories('typeExpense') : tCategories('typeIncome')}</TableCell>
                <TableCell className="text-right">{Number(rule.amount).toFixed(2)} {rule.currency}</TableCell>
                <TableCell>{t(frequencyKey[rule.frequency])}</TableCell>
                <TableCell>{new Date(rule.nextRunDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={rule.active ? 'default' : 'secondary'} className="gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${rule.active ? 'bg-[var(--positive)]' : 'bg-muted-foreground'}`}
                    />
                    {rule.active ? t('statusActive') : t('statusPaused')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <RecurringTransactionFormDialog
                    rule={rule}
                    trigger={
                      <Button size="icon" aria-label={tCommon('edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  {rule.active ? (
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={t('pause')}
                      onClick={() => toggleActive.mutate({ id: rule.id, active: false })}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      aria-label={t('resume')}
                      className="bg-[var(--positive)] text-white hover:opacity-90"
                      onClick={() => toggleActive.mutate({ id: rule.id, active: true })}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="destructive" size="icon" aria-label={tCommon('delete')} onClick={() => remove.mutate(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Page**

```typescript
// src/app/[locale]/(dashboard)/recurring-transactions/page.tsx
import { getTranslations } from 'next-intl/server'
import { RecurringTransactionList } from '@/features/recurring-transactions/components/RecurringTransactionList'

export default async function RecurringTransactionsPage() {
  const t = await getTranslations('RecurringTransactions')
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <RecurringTransactionList />
    </div>
  )
}
```

- [ ] **Step 8: Manual verification**

Run `npm run dev`, visit `/es/recurring-transactions`, create a monthly "Salary" rule dated today, confirm it lists with the correct next-run date and translated frequency/status labels (status badge shows a colored dot — green when active, gray when paused), row actions render as solid icon buttons (accent edit, gray pause / green resume, destructive delete), pause/resume it, edit it, delete it. Switch to `/en/recurring-transactions` and confirm full English rendering, then toggle dark mode and confirm the status badge remains legible in both themes.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(recurring): build recurring transactions management UI"
```

---

### Task 3: Recurring transaction generation cron

**Files:**
- Create: `src/features/recurring-transactions/generate.ts`
- Create: `src/features/recurring-transactions/generate.test.ts`
- Create: `src/app/api/cron/recurring-transactions/route.ts`
- Create or modify: `vercel.json`

**Interfaces:**
- Consumes: `db`, `RecurringTransaction`/`RecurrenceFrequency` from `@prisma/client`.
- Produces: `generateDueRecurringTransactions(db, now?)`, hit daily by Vercel Cron.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/recurring-transactions/generate.test.ts
import { describe, it, expect, vi } from 'vitest'
import { generateDueRecurringTransactions } from './generate'

function makeMockDb(dueRules: any[]) {
  return {
    recurringTransaction: {
      findMany: vi.fn().mockResolvedValue(dueRules),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any
}

describe('generateDueRecurringTransactions', () => {
  it('creates a transaction and advances nextRunDate for each due rule', async () => {
    const rule = {
      id: 'rec-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      type: 'INCOME',
      amount: 3000,
      currency: 'USD',
      note: null,
      frequency: 'MONTHLY',
      nextRunDate: new Date('2026-07-01'),
    }
    const db = makeMockDb([rule])

    const result = await generateDueRecurringTransactions(db, new Date('2026-07-04'))

    expect(result).toEqual({ generated: 1 })
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'cat-1',
        type: 'INCOME',
        amount: 3000,
        currency: 'USD',
        date: new Date('2026-07-01'),
        note: null,
        recurringId: 'rec-1',
      },
    })
    expect(db.recurringTransaction.update).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      data: { nextRunDate: new Date('2026-08-01') },
    })
  })

  it('advances WEEKLY by 7 days and YEARLY by 1 year', async () => {
    const weekly = {
      id: 'rec-w', userId: 'u', categoryId: 'c', type: 'EXPENSE', amount: 10,
      currency: 'USD', note: null, frequency: 'WEEKLY', nextRunDate: new Date('2026-07-01'),
    }
    const yearly = {
      id: 'rec-y', userId: 'u', categoryId: 'c', type: 'EXPENSE', amount: 10,
      currency: 'USD', note: null, frequency: 'YEARLY', nextRunDate: new Date('2026-07-01'),
    }
    const db = makeMockDb([weekly, yearly])

    await generateDueRecurringTransactions(db, new Date('2026-07-04'))

    expect(db.recurringTransaction.update).toHaveBeenCalledWith({
      where: { id: 'rec-w' },
      data: { nextRunDate: new Date('2026-07-08') },
    })
    expect(db.recurringTransaction.update).toHaveBeenCalledWith({
      where: { id: 'rec-y' },
      data: { nextRunDate: new Date('2027-07-01') },
    })
  })

  it('only queries active rules whose nextRunDate has passed', async () => {
    const db = makeMockDb([])
    const now = new Date('2026-07-04')

    await generateDueRecurringTransactions(db, now)

    expect(db.recurringTransaction.findMany).toHaveBeenCalledWith({
      where: { active: true, nextRunDate: { lte: now } },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- generate.test.ts`
Expected: FAIL — `Cannot find module './generate'`.

- [ ] **Step 3: Implement**

```typescript
// src/features/recurring-transactions/generate.ts
import type { PrismaClient, RecurrenceFrequency } from '@prisma/client'

function advanceDate(date: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(date)
  if (frequency === 'WEEKLY') next.setDate(next.getDate() + 7)
  else if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1)
  else next.setFullYear(next.getFullYear() + 1)
  return next
}

export async function generateDueRecurringTransactions(
  db: PrismaClient,
  now: Date = new Date()
): Promise<{ generated: number }> {
  const dueRules = await db.recurringTransaction.findMany({
    where: { active: true, nextRunDate: { lte: now } },
  })

  let generated = 0
  for (const rule of dueRules) {
    // Atomic per rule: if the process dies mid-loop, a retry never
    // double-creates a transaction or skips advancing nextRunDate.
    await db.$transaction([
      db.transaction.create({
        data: {
          userId: rule.userId,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          date: rule.nextRunDate,
          note: rule.note,
          recurringId: rule.id,
        },
      }),
      db.recurringTransaction.update({
        where: { id: rule.id },
        data: { nextRunDate: advanceDate(rule.nextRunDate, rule.frequency) },
      }),
    ])
    generated++
  }

  return { generated }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- generate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Cron endpoint**

```typescript
// src/app/api/cron/recurring-transactions/route.ts
import type { NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { generateDueRecurringTransactions } from '@/features/recurring-transactions/generate'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await generateDueRecurringTransactions(db)
  if (result.generated > 0) {
    // This path creates Transaction rows and advances nextRunDate outside of
    // actions.ts, so it must invalidate the same tags actions.ts would have.
    revalidateTag('transactions')
    revalidateTag('recurring-transactions')
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
      "path": "/api/cron/recurring-transactions",
      "schedule": "0 7 * * *"
    }
  ]
}
```
If it already exists (e.g. the Currency/FX/Dashboard branch merged first and added its own `fx-rates` entry), add this object to the existing `crons` array instead of overwriting the file.

- [ ] **Step 7: Manual verification**

Create a MONTHLY recurring rule with `startDate` set to today or earlier (via the UI from Task 2), then:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/recurring-transactions
```
Expected: `{"generated": 1}`. Confirm in `/es/transactions` that a new transaction appeared, and in `/es/recurring-transactions` that `nextRunDate` advanced by one month. Run the same curl again immediately — expect `{"generated": 0}`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(recurring): add daily recurring-transaction generation cron job"
```

---

### Task 4: Open the PR to develop

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feature/recurring-transactions
gh pr create --base develop --title "Recurring transactions: CRUD + generation cron" --body "Implements docs/superpowers/specs/2026-07-25-recurring-transactions-design.md. Depends on feature/foundation, feature/categories, and feature/transactions already merged."
```
