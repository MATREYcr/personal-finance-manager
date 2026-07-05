# Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build full CRUD (queries, actions, UI) for manually-entered transactions, with filtering and a category-ownership check.

**Architecture:** `src/features/transactions/` holds queries.ts, actions.ts, hooks/, components/ — same shape as the Categories feature.

**Tech Stack:** Next.js 15, Prisma, Zod, TanStack Query, react-hook-form, shadcn/ui, next-intl, Vitest.

**Branch:** `feature/transactions`, created from `develop` **after** `feature/categories` is merged. PR target: `develop`.

## Global Constraints

- Package manager is npm.
- Every Server Action validates input with Zod and scopes by the authenticated `userId`.
- `queries.ts` uses `'use cache'` + `cacheTag('transactions')`; `actions.ts` mutations call `revalidateTag('transactions')` after a successful write.
- A transaction's `categoryId` must be verified to belong to the current user before create/update — never trust a client-supplied id.
- Do not set or expose `recurringId` anywhere in this plan — it stays null until the Recurring Transactions plan.
- All routes live under `src/app/[locale]/...`. All user-facing text uses `next-intl` (`useTranslations` in Client Components) under this feature's own `Transactions` namespace — no hardcoded strings. All styling uses shadcn's theme-aware Tailwind tokens (never hardcoded colors).

## Prerequisites (from Foundation + Categories, already merged)

- `db`, `requireSession()`, `Transaction` model.
- `queryKeys` at `@/lib/query/keys` (this plan adds a `transactions` key).
- `useCategories()` hook at `@/features/categories/hooks/useCategories` and `Category` type at `@/features/categories/types` — used for the category-select dropdown. The `Categories` namespace in the message catalogs already provides `typeExpense`/`typeIncome` labels, reused here via `useTranslations('Categories')` where a category type needs to be displayed.
- `src/app/[locale]/(dashboard)/layout.tsx` nav already links to `/transactions`.
- `messages/es.json` / `messages/en.json` already contain `Common`, `Auth`, `Categories` — this plan adds a new top-level `Transactions` namespace.

---

## File Structure

```
src/features/transactions/
├── types.ts
├── queries.ts
├── actions.ts
├── actions.test.ts
├── hooks/{useTransactions.ts,useTransactionMutations.ts}
└── components/{TransactionFilters.tsx,TransactionFormDialog.tsx,TransactionList.tsx}
src/app/api/transactions/route.ts
src/app/[locale]/(dashboard)/transactions/page.tsx
```

---

### Task 1: Transactions queries and actions

**Files:**
- Create: `src/features/transactions/types.ts`
- Create: `src/features/transactions/queries.ts`
- Create: `src/features/transactions/actions.ts`
- Create: `src/features/transactions/actions.test.ts`
- Modify: `src/lib/query/keys.ts` (add the `transactions` key)

**Interfaces:**
- Consumes: `requireSession` (Foundation), `db` (Foundation), `Transaction`/`Category`/`TransactionType` from `@prisma/client`.
- Produces: `getTransactions(userId, filters)`, `createTransaction(input)`, `updateTransaction(input)`, `deleteTransaction(id)`, `TransactionFilters` type, `queryKeys.transactions` — consumed by Task 2's UI and later by the Recurring Transactions plan's generation cron (which creates `Transaction` rows directly via `db`, not via this module, but must match this schema/shape).

- [ ] **Step 1: Add the transactions key to the shared query keys file**

```typescript
// src/lib/query/keys.ts (add alongside the existing `categories` key)
export const queryKeys = {
  categories: {
    all: ['categories'] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters: Record<string, string | undefined>) => ['transactions', filters] as const,
  },
}
```

- [ ] **Step 2: Domain types**

```typescript
// src/features/transactions/types.ts
import type { Transaction, Category } from '@prisma/client'

export type TransactionWithCategory = Transaction & { category: Category }

export interface TransactionFilters {
  categoryId?: string
  type?: 'EXPENSE' | 'INCOME'
  from?: string // ISO date
  to?: string // ISO date
}
```

- [ ] **Step 3: Write the failing test**

```typescript
// src/features/transactions/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRequireSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))

const mockDb = {
  transaction: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  category: { findFirst: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { createTransaction } from './actions'

describe('createTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('rejects a category that does not belong to the current user', async () => {
    mockDb.category.findFirst.mockResolvedValue(null)

    await expect(
      createTransaction({
        categoryId: 'someone-elses-category',
        type: 'EXPENSE',
        amount: 10,
        currency: 'USD',
        date: '2026-07-01',
      })
    ).rejects.toThrow(/category/i)
    expect(mockDb.transaction.create).not.toHaveBeenCalled()
  })

  it('creates the transaction when the category belongs to the user', async () => {
    mockDb.category.findFirst.mockResolvedValue({ id: 'cat-1' })
    mockDb.transaction.create.mockResolvedValue({ id: 'tx-1' })

    const result = await createTransaction({
      categoryId: 'cat-1',
      type: 'EXPENSE',
      amount: 10,
      currency: 'USD',
      date: '2026-07-01',
    })

    expect(result).toEqual({ id: 'tx-1' })
    expect(mockDb.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        categoryId: 'cat-1',
        type: 'EXPENSE',
        amount: 10,
        currency: 'USD',
        date: new Date('2026-07-01'),
        note: undefined,
      },
    })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- transactions/actions.test.ts`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 5: Write queries.ts**

```typescript
// src/features/transactions/queries.ts
'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import type { TransactionFilters } from './types'

export async function getTransactions(userId: string, filters: TransactionFilters = {}) {
  cacheTag('transactions')
  return db.transaction.findMany({
    where: {
      userId,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    },
    include: { category: true },
    orderBy: { date: 'desc' },
  })
}
```

- [ ] **Step 6: Write actions.ts**

```typescript
// src/features/transactions/actions.ts
'use server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

const transactionInputSchema = z.object({
  categoryId: z.string().min(1),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  date: z.string().min(1),
  note: z.string().max(280).optional(),
})

async function assertOwnsCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({ where: { id: categoryId, userId } })
  if (!category) throw new Error('That category does not exist for this user')
}

export async function createTransaction(input: z.infer<typeof transactionInputSchema>) {
  const session = await requireSession()
  const { categoryId, type, amount, currency, date, note } = transactionInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  const transaction = await db.transaction.create({
    data: { userId: session.user.id, categoryId, type, amount, currency, date: new Date(date), note },
  })

  revalidateTag('transactions')
  return transaction
}

const updateTransactionInputSchema = transactionInputSchema.extend({
  id: z.string().min(1),
})

export async function updateTransaction(input: z.infer<typeof updateTransactionInputSchema>) {
  const session = await requireSession()
  const { id, categoryId, type, amount, currency, date, note } = updateTransactionInputSchema.parse(input)

  await assertOwnsCategory(session.user.id, categoryId)

  const transaction = await db.transaction.update({
    where: { id, userId: session.user.id },
    data: { categoryId, type, amount, currency, date: new Date(date), note },
  })

  revalidateTag('transactions')
  return transaction
}

export async function deleteTransaction(id: string) {
  const session = await requireSession()
  await db.transaction.delete({ where: { id, userId: session.user.id } })
  revalidateTag('transactions')
}
```

> Note: the category-ownership error thrown here (`'That category does not exist for this user'`) is a defensive/should-never-happen case (the UI only ever offers the current user's own categories in the select) rather than a user-facing validation message, so unlike Categories' `deleteError` it is not translated — it exists purely to fail loudly if the client-sent id is ever wrong or tampered with.

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- transactions/actions.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(transactions): add CRUD queries/actions with category ownership check"
```

---

### Task 2: Transactions UI

**Files:**
- Create: `src/app/api/transactions/route.ts`
- Create: `src/features/transactions/hooks/useTransactions.ts`
- Create: `src/features/transactions/hooks/useTransactionMutations.ts`
- Create: `src/features/transactions/components/TransactionFilters.tsx`
- Create: `src/features/transactions/components/TransactionFormDialog.tsx`
- Create: `src/features/transactions/components/TransactionList.tsx`
- Create: `src/app/[locale]/(dashboard)/transactions/page.tsx`
- Modify: `messages/es.json`, `messages/en.json` (add the `Transactions` namespace)

**Interfaces:**
- Consumes: `getTransactions`/`createTransaction`/`updateTransaction`/`deleteTransaction` (Task 1), `useCategories` (Categories plan), `queryKeys.transactions` (Task 1).
- Produces: a working `/transactions` page with filters. `TransactionFormDialog`'s field set (categoryId, type, amount, currency, date, note) is the pattern the Recurring Transactions plan's form reuses with two added fields (frequency, startDate).

- [ ] **Step 1: API route backing the list hook**

```typescript
// src/app/api/transactions/route.ts
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getTransactions } from '@/features/transactions/queries'
import type { TransactionFilters } from '@/features/transactions/types'

export async function GET(request: Request) {
  const session = await requireSession()
  const { searchParams } = new URL(request.url)
  const filters: TransactionFilters = {
    categoryId: searchParams.get('categoryId') ?? undefined,
    type: (searchParams.get('type') as 'EXPENSE' | 'INCOME' | null) ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  }
  const transactions = await getTransactions(session.user.id, filters)
  return NextResponse.json(transactions)
}
```

- [ ] **Step 2: List query hook**

```typescript
// src/features/transactions/hooks/useTransactions.ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { TransactionFilters } from '../types'

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters as Record<string, string | undefined>),
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][]
      )
      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load transactions')
      return res.json()
    },
  })
}
```

- [ ] **Step 3: Mutation hooks**

```typescript
// src/features/transactions/hooks/useTransactionMutations.ts
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { createTransaction, updateTransaction, deleteTransaction } from '../actions'

export function useTransactionMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.transactions.all })

  return {
    create: useMutation({ mutationFn: createTransaction, onSuccess: invalidate }),
    update: useMutation({ mutationFn: updateTransaction, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: deleteTransaction, onSuccess: invalidate }),
  }
}
```

- [ ] **Step 4: Add the Transactions message keys**

```json
// messages/es.json — add a new top-level "Transactions" namespace
  "Transactions": {
    "title": "Transacciones",
    "newTransaction": "Nueva transacción",
    "editTransaction": "Editar transacción",
    "loading": "Cargando transacciones…",
    "filterAllTypes": "Todos los tipos",
    "filterAllCategories": "Todas las categorías",
    "amount": "Monto",
    "currency": "Moneda (ej. USD)",
    "note": "Nota (opcional)",
    "categoryPlaceholder": "Categoría",
    "columnDate": "Fecha",
    "columnCategory": "Categoría",
    "columnType": "Tipo",
    "columnAmount": "Monto",
    "columnActions": "Acciones"
  }
```

```json
// messages/en.json — add a new top-level "Transactions" namespace
  "Transactions": {
    "title": "Transactions",
    "newTransaction": "New transaction",
    "editTransaction": "Edit transaction",
    "loading": "Loading transactions…",
    "filterAllTypes": "All types",
    "filterAllCategories": "All categories",
    "amount": "Amount",
    "currency": "Currency (e.g. USD)",
    "note": "Note (optional)",
    "categoryPlaceholder": "Category",
    "columnDate": "Date",
    "columnCategory": "Category",
    "columnType": "Type",
    "columnAmount": "Amount",
    "columnActions": "Actions"
  }
```

- [ ] **Step 5: Filters bar**

```typescript
// src/features/transactions/components/TransactionFilters.tsx
'use client'
import { useTranslations } from 'next-intl'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useCategories } from '@/features/categories/hooks/useCategories'
import type { TransactionFilters as Filters } from '../types'
import type { Category } from '@/features/categories/types'

export function TransactionFilters({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (next: Filters) => void
}) {
  const t = useTranslations('Transactions')
  const tCategories = useTranslations('Categories')
  const { data: categories } = useCategories()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Select
        value={filters.type ?? 'ALL'}
        onValueChange={(v) => onChange({ ...filters, type: v === 'ALL' ? undefined : (v as 'EXPENSE' | 'INCOME') })}
      >
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t('filterAllTypes')} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t('filterAllTypes')}</SelectItem>
          <SelectItem value="EXPENSE">{tCategories('typeExpense')}</SelectItem>
          <SelectItem value="INCOME">{tCategories('typeIncome')}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.categoryId ?? 'ALL'}
        onValueChange={(v) => onChange({ ...filters, categoryId: v === 'ALL' ? undefined : v })}
      >
        <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder={t('filterAllCategories')} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t('filterAllCategories')}</SelectItem>
          {(categories as Category[] | undefined)?.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-full sm:w-40"
        value={filters.from ?? ''}
        onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
      />
      <Input
        type="date"
        className="w-full sm:w-40"
        value={filters.to ?? ''}
        onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
      />
    </div>
  )
}
```

- [ ] **Step 6: Create/edit form dialog**

```typescript
// src/features/transactions/components/TransactionFormDialog.tsx
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
import { useTransactionMutations } from '../hooks/useTransactionMutations'
import type { TransactionWithCategory } from '../types'
import type { Category } from '@/features/categories/types'

const schema = z.object({
  categoryId: z.string().min(1, 'Required'),
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.coerce.number().positive('Must be greater than 0'),
  currency: z.string().min(3).max(3),
  date: z.string().min(1, 'Required'),
  note: z.string().max(280).optional(),
})
type FormValues = z.infer<typeof schema>

export function TransactionFormDialog({
  transaction,
  trigger,
}: {
  transaction?: TransactionWithCategory
  trigger: React.ReactNode
}) {
  const t = useTranslations('Transactions')
  const tCategories = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { data: categories } = useCategories()
  const { create, update } = useTransactionMutations()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: transaction?.categoryId ?? '',
      type: transaction?.type ?? 'EXPENSE',
      amount: transaction ? Number(transaction.amount) : 0,
      currency: transaction?.currency ?? 'USD',
      date: transaction ? transaction.date.toString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      note: transaction?.note ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    if (transaction) {
      await update.mutateAsync({ id: transaction.id, ...values })
    } else {
      await create.mutateAsync(values)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? t('editTransaction') : t('newTransaction')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Select
            defaultValue={form.getValues('type')}
            onValueChange={(v) => form.setValue('type', v as 'EXPENSE' | 'INCOME')}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">{tCategories('typeExpense')}</SelectItem>
              <SelectItem value="INCOME">{tCategories('typeIncome')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            defaultValue={form.getValues('categoryId')}
            onValueChange={(v) => form.setValue('categoryId', v)}
          >
            <SelectTrigger><SelectValue placeholder={t('categoryPlaceholder')} /></SelectTrigger>
            <SelectContent>
              {(categories as Category[] | undefined)?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" placeholder={t('amount')} {...form.register('amount')} />
          <Input placeholder={t('currency')} maxLength={3} {...form.register('currency')} />
          <Input type="date" {...form.register('date')} />
          <Input placeholder={t('note')} {...form.register('note')} />
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || update.isPending}>{tCommon('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 7: List**

```typescript
// src/features/transactions/components/TransactionList.tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTransactions } from '../hooks/useTransactions'
import { useTransactionMutations } from '../hooks/useTransactionMutations'
import { TransactionFilters } from './TransactionFilters'
import { TransactionFormDialog } from './TransactionFormDialog'
import type { TransactionFilters as Filters, TransactionWithCategory } from '../types'

export function TransactionList() {
  const t = useTranslations('Transactions')
  const tCategories = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const [filters, setFilters] = useState<Filters>({})
  const { data: transactions, isLoading } = useTransactions(filters)
  const { remove } = useTransactionMutations()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TransactionFilters filters={filters} onChange={setFilters} />
        <TransactionFormDialog trigger={<Button>{t('newTransaction')}</Button>} />
      </div>

      {isLoading ? (
        <p>{t('loading')}</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columnDate')}</TableHead>
                <TableHead>{t('columnCategory')}</TableHead>
                <TableHead>{t('columnType')}</TableHead>
                <TableHead className="text-right">{t('columnAmount')}</TableHead>
                <TableHead className="text-right">{t('columnActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(transactions as TransactionWithCategory[] | undefined)?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                  <TableCell>{tx.category.name}</TableCell>
                  <TableCell>{tx.type === 'EXPENSE' ? tCategories('typeExpense') : tCategories('typeIncome')}</TableCell>
                  <TableCell className="text-right">{Number(tx.amount).toFixed(2)} {tx.currency}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <TransactionFormDialog transaction={tx} trigger={<Button variant="outline" size="sm">{tCommon('edit')}</Button>} />
                    <Button variant="destructive" size="sm" onClick={() => remove.mutate(tx.id)}>{tCommon('delete')}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Page**

```typescript
// src/app/[locale]/(dashboard)/transactions/page.tsx
import { getTranslations } from 'next-intl/server'
import { TransactionList } from '@/features/transactions/components/TransactionList'

export default async function TransactionsPage() {
  const t = await getTranslations('Transactions')
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <TransactionList />
    </div>
  )
}
```

- [ ] **Step 9: Manual verification**

Run `npm run dev`, visit `/es/transactions`. Create an expense and an income transaction in different currencies, confirm they list correctly, edit one, delete one, confirm the type/category/date filters narrow the list. Switch to `/en/transactions` and confirm full English rendering, then toggle dark mode and confirm legibility. Then go to `/es/categories` and confirm deleting a category that now has a transaction shows the blocked-delete error from the Categories plan, translated.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(transactions): build transactions management UI with filters"
```

---

### Task 3: Open the PR to develop

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feature/transactions
gh pr create --base develop --title "Transactions: CRUD + filtered UI" --body "Implements docs/superpowers/specs/2026-07-18-transactions-design.md. Depends on feature/foundation and feature/categories already merged. Enables the Recurring Transactions and Currency/FX/Dashboard branches to follow."
```
