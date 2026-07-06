# Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed default categories on signup and build full CRUD (queries, actions, UI) for per-user categories, with a delete guard that blocks removing a category still in use.

**Architecture:** `src/features/categories/` holds queries.ts (cached reads), actions.ts (Server Action writes), a seeding module wired into Better Auth's signup hook, hooks/ + components/ for the client UI.

**Tech Stack:** Next.js 15, Prisma, Zod, TanStack Query, react-hook-form, shadcn/ui, next-intl, Vitest.

**Branch:** `feature/categories`, created from `develop` **after** `feature/foundation` is merged. PR target: `develop`.

## Global Constraints

- Package manager is npm.
- Every Server Action validates input with Zod and scopes by the authenticated `userId` — never trust a client-supplied user id.
- `queries.ts` uses `'use cache'` + `cacheTag('categories')`; `actions.ts` mutations call **`updateTag('categories')`** (not `revalidateTag`) after a successful write — `updateTag` is Next.js 16's read-your-own-writes primitive, immediately expiring the cache instead of `revalidateTag`'s stale-while-revalidate behavior, and it's only usable from Server Actions (never from a Route Handler — cron endpoints in later plans must keep using `revalidateTag`).
- Category deletion is blocked (friendly error) while any `Transaction` or `RecurringTransaction` references it — this plan can only test the empty-reference case for transactions/recurring counts (those tables have no real feature yet), but the guard logic and its test must be written now since Categories ships before Transactions.
- All routes live under `src/app/[locale]/...`. All user-facing text uses `next-intl` (`useTranslations` in Client Components, `getTranslations` in Server Actions/Components) under this feature's own `Categories` namespace — no hardcoded strings. All styling uses shadcn's theme-aware Tailwind tokens (never hardcoded colors) so it works in both light and dark mode.
- This project's shadcn components (`Dialog`, `Sheet`, etc.) are built on `@base-ui/react`, not Radix — there is no `asChild` prop. To compose a trigger with a custom element, pass it via the `render` prop instead: `<DialogTrigger render={trigger} />` (self-closing; `DialogTrigger`'s own children, if any, would override `trigger`'s children, so leave it childless when `trigger` already carries its own content). `trigger`'s type must be `React.ReactElement`, not the wider `React.ReactNode` — `render` only accepts an element or a render function.

## Prerequisites (from Foundation, already merged)

- `db` singleton at `@/lib/db`.
- `requireSession()` at `@/lib/auth/session`.
- `Category` model in `prisma/schema.prisma` (via `@prisma/client`).
- `queryKeys` at `@/lib/query/keys` (this plan adds a `categories` key to it).
- `<QueryProvider>`, `<ThemeProvider>`, and `<NextIntlClientProvider>` already wired in `src/app/[locale]/layout.tsx`.
- shadcn components already installed: button, input, label, card, dialog, table, select, tabs, badge, alert, sheet (no `form` — this project doesn't use shadcn's `Form`/`FormField` wrapper, forms use `react-hook-form` directly). `lucide-react` is available (installed alongside shadcn init) for row-action icons.
- `src/app/[locale]/(dashboard)/layout.tsx` nav already links to `/categories` and reads `Common.nav`/`Common.actions` keys from the message catalogs.
- `messages/es.json` / `messages/en.json` already contain `Common` and `Auth` namespaces — this plan adds a new top-level `Categories` namespace.

---

## File Structure

```
src/features/categories/
├── default-categories.ts
├── seed.ts
├── seed.test.ts
├── types.ts
├── queries.ts
├── actions.ts
├── actions.test.ts
├── hooks/{useCategories.ts,useCategoryMutations.ts}
└── components/{CategoryList.tsx,CategoryFormDialog.tsx}
src/app/api/categories/route.ts
src/app/[locale]/(dashboard)/categories/page.tsx
```

---

### Task 1: Default category seeding on signup

**Files:**
- Create: `src/features/categories/default-categories.ts`
- Create: `src/features/categories/seed.ts`
- Create: `src/features/categories/seed.test.ts`
- Modify: `src/lib/auth/index.ts` (add `databaseHooks`)

**Interfaces:**
- Consumes: `db` from `@/lib/db`, `PrismaClient`/`TransactionType` from `@prisma/client`.
- Produces: `DEFAULT_CATEGORIES`, `seedDefaultCategories(db, userId)` — wired into the Better Auth signup hook, not otherwise exported for use.

The default category *names* are stored once, in English, as stable identifiers — not translated per user. (A category named "Market" is the user's own editable data from that point on, same as any category they'd create by hand; it is not re-translated if they switch the UI language. This mirrors how seeded data works in any i18n app: seed data is a starting point, not living UI copy.)

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/categories/seed.test.ts
import { describe, it, expect, vi } from 'vitest'
import { seedDefaultCategories } from './seed'
import { DEFAULT_CATEGORIES } from './default-categories'

describe('seedDefaultCategories', () => {
  it('creates one category per default entry, scoped to the given user', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: DEFAULT_CATEGORIES.length })
    const mockDb = { category: { createMany } } as any

    await seedDefaultCategories(mockDb, 'user-1')

    expect(createMany).toHaveBeenCalledWith({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: 'user-1' })),
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- seed.test.ts`
Expected: FAIL — `Cannot find module './seed'` (and `./default-categories`).

- [ ] **Step 3: Write the default categories list**

```typescript
// src/features/categories/default-categories.ts
import type { TransactionType } from '@prisma/client'

export const DEFAULT_CATEGORIES: Array<{ name: string; type: TransactionType }> = [
  { name: 'Market', type: 'EXPENSE' },
  { name: 'Transport', type: 'EXPENSE' },
  { name: 'Rent', type: 'EXPENSE' },
  { name: 'Utilities', type: 'EXPENSE' },
  { name: 'Entertainment', type: 'EXPENSE' },
  { name: 'Health', type: 'EXPENSE' },
  { name: 'Other', type: 'EXPENSE' },
  { name: 'Salary', type: 'INCOME' },
  { name: 'Other Income', type: 'INCOME' },
]
```

- [ ] **Step 4: Write the minimal implementation**

```typescript
// src/features/categories/seed.ts
import type { PrismaClient } from '@prisma/client'
import { DEFAULT_CATEGORIES } from './default-categories'

export async function seedDefaultCategories(db: PrismaClient, userId: string) {
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- seed.test.ts`
Expected: PASS.

- [ ] **Step 6: Wire the hook into Better Auth**

Add to `src/lib/auth/index.ts` (inside the existing `betterAuth({...})` config object):

```typescript
import { db } from '@/lib/db'
import { seedDefaultCategories } from '@/features/categories/seed'

// ...inside betterAuth({ ... }), alongside database/emailAndPassword/user:
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // This hook runs after the user (and account) rows are already
          // committed — an uncaught throw here would surface as a 500 on
          // signup even though the account now exists, leaving the client
          // with no way to retry (a repeat signup would just hit "email
          // already in use"). Log and swallow instead: a user with zero
          // seeded categories is recoverable (they can add their own), a
          // signup that silently succeeded but reported failure is not.
          try {
            await seedDefaultCategories(db, user.id)
          } catch (error) {
            console.error(`Failed to seed default categories for user ${user.id}:`, error)
          }
        },
      },
    },
  },
```

- [ ] **Step 7: Manual verification**

Run `npm run dev`, sign up a new test account, then run `npx prisma studio` and confirm the new user has 9 `Category` rows.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(categories): seed default categories for every new user"
```

---

### Task 2: Categories queries and actions

**Files:**
- Create: `src/features/categories/types.ts`
- Create: `src/features/categories/queries.ts`
- Create: `src/features/categories/actions.ts`
- Create: `src/features/categories/actions.test.ts`
- Modify: `src/lib/query/keys.ts` (add the `categories` key)
- Modify: `messages/es.json`, `messages/en.json` (add the `Categories` namespace's `deleteError` key, used by the Server Action's thrown error message)

**Interfaces:**
- Consumes: `requireSession` from `@/lib/auth/session`, `db` from `@/lib/db`, `Category` type from `@prisma/client`.
- Produces: `getCategories(userId)`, `createCategory(input)`, `updateCategory(input)`, `deleteCategory(categoryId)`, `queryKeys.categories.all` — consumed by Task 3's UI, and later by the Transactions and Recurring Transactions plans (category select dropdowns, ownership checks).

- [ ] **Step 1: Add the categories key to the shared query keys file**

```typescript
// src/lib/query/keys.ts
export const queryKeys = {
  categories: {
    all: ['categories'] as const,
  },
}
```

- [ ] **Step 2: Domain types**

```typescript
// src/features/categories/types.ts
import type { Category } from '@prisma/client'

export type { Category }
```

- [ ] **Step 3: Write the failing test for the deletion guard**

`vi.mock()` factories are hoisted above top-level `const` declarations by
Vitest, so any mock object a factory references must be created via
`vi.hoisted()` — otherwise it throws "Cannot access before initialization".

```typescript
// src/features/categories/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireSession, mockGetTranslations, mockDb } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockGetTranslations: vi.fn(),
  mockDb: {
    category: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    transaction: { count: vi.fn() },
    recurringTransaction: { count: vi.fn() },
  },
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))
vi.mock('next-intl/server', () => ({ getTranslations: () => mockGetTranslations() }))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

import { deleteCategory } from './actions'

describe('deleteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockGetTranslations.mockResolvedValue((key: string) => key)
  })

  it('throws and does not delete when transactions still reference the category', async () => {
    mockDb.transaction.count.mockResolvedValue(2)
    mockDb.recurringTransaction.count.mockResolvedValue(0)

    await expect(deleteCategory('cat-1')).rejects.toThrow('deleteError')
    expect(mockDb.category.delete).not.toHaveBeenCalled()
  })

  it('deletes the category when nothing references it', async () => {
    mockDb.transaction.count.mockResolvedValue(0)
    mockDb.recurringTransaction.count.mockResolvedValue(0)

    await deleteCategory('cat-1')

    expect(mockDb.category.delete).toHaveBeenCalledWith({
      where: { id: 'cat-1', userId: 'user-1' },
    })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- actions.test.ts`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 5: Write queries.ts**

```typescript
// src/features/categories/queries.ts
'use cache'
import { cacheTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getCategories(userId: string) {
  cacheTag('categories')
  return db.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  })
}
```

- [ ] **Step 6: Add the deleteError message key**

```json
// messages/es.json — add a new top-level "Categories" namespace
  "Categories": {
    "deleteError": "No se puede eliminar una categoría que todavía tiene transacciones. Reasigná o eliminá esas transacciones primero."
  }
```

```json
// messages/en.json — add a new top-level "Categories" namespace
  "Categories": {
    "deleteError": "Cannot delete a category that still has transactions. Reassign or delete those transactions first."
  }
```

- [ ] **Step 7: Write actions.ts**

```typescript
// src/features/categories/actions.ts
'use server'
import { z } from 'zod'
import { updateTag } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'

const categoryInputSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['EXPENSE', 'INCOME']),
})

export async function createCategory(input: z.infer<typeof categoryInputSchema>) {
  const session = await requireSession()
  const { name, type } = categoryInputSchema.parse(input)

  const category = await db.category.create({
    data: { userId: session.user.id, name, type },
  })

  updateTag('categories')
  return category
}

const updateCategoryInputSchema = categoryInputSchema.extend({
  id: z.string().min(1),
})

export async function updateCategory(input: z.infer<typeof updateCategoryInputSchema>) {
  const session = await requireSession()
  const { id, name, type } = updateCategoryInputSchema.parse(input)

  const category = await db.category.update({
    where: { id, userId: session.user.id },
    data: { name, type },
  })

  updateTag('categories')
  return category
}

export async function deleteCategory(categoryId: string) {
  const session = await requireSession()

  const [transactionCount, recurringCount] = await Promise.all([
    db.transaction.count({ where: { categoryId, userId: session.user.id } }),
    db.recurringTransaction.count({ where: { categoryId, userId: session.user.id } }),
  ])

  if (transactionCount > 0 || recurringCount > 0) {
    const t = await getTranslations('Categories')
    throw new Error(t('deleteError'))
  }

  await db.category.delete({ where: { id: categoryId, userId: session.user.id } })
  updateTag('categories')
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- actions.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(categories): add CRUD queries/actions with delete-guard"
```

---

### Task 3: Categories UI

**Files:**
- Create: `src/features/categories/hooks/useCategories.ts`
- Create: `src/features/categories/hooks/useCategoryMutations.ts`
- Create: `src/features/categories/components/CategoryList.tsx`
- Create: `src/features/categories/components/CategoryFormDialog.tsx`
- Create: `src/app/api/categories/route.ts`
- Create: `src/app/[locale]/(dashboard)/categories/page.tsx`
- Modify: `messages/es.json`, `messages/en.json` (add the rest of the `Categories` namespace)

**Interfaces:**
- Consumes: `getCategories`, `createCategory`, `updateCategory`, `deleteCategory` (Task 2), `queryKeys.categories` (Task 2), `requireSession` (Foundation).
- Produces: a working `/categories` page. `useCategories()` (Task hooks) is consumed later by the Transactions and Recurring Transactions UIs for their category-select dropdowns.

- [ ] **Step 1: Install form deps**

```bash
npm install react-hook-form @hookform/resolvers zod
```

- [ ] **Step 2: API route backing the query hook**

```typescript
// src/app/api/categories/route.ts
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getCategories } from '@/features/categories/queries'

export async function GET() {
  const session = await requireSession()
  const categories = await getCategories(session.user.id)
  return NextResponse.json(categories)
}
```

- [ ] **Step 3: Query hook**

```typescript
// src/features/categories/hooks/useCategories.ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { useSession } from '@/lib/auth/client'

export function useCategories() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed to load categories')
      return res.json()
    },
    enabled: !!session,
  })
}
```

- [ ] **Step 4: Mutation hooks**

```typescript
// src/features/categories/hooks/useCategoryMutations.ts
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { createCategory, updateCategory, deleteCategory } from '../actions'

export function useCategoryMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.categories.all })

  const create = useMutation({ mutationFn: createCategory, onSuccess: invalidate })
  const update = useMutation({ mutationFn: updateCategory, onSuccess: invalidate })
  const remove = useMutation({ mutationFn: deleteCategory, onSuccess: invalidate })

  return { create, update, remove }
}
```

- [ ] **Step 5: Add the remaining Categories message keys**

```json
// messages/es.json — extend the "Categories" namespace from Task 2
  "Categories": {
    "deleteError": "No se puede eliminar una categoría que todavía tiene transacciones. Reasigná o eliminá esas transacciones primero.",
    "title": "Categorías",
    "newCategory": "Nueva categoría",
    "editCategory": "Editar categoría",
    "name": "Nombre",
    "typeExpense": "Gasto",
    "typeIncome": "Ingreso",
    "loading": "Cargando categorías…",
    "columnName": "Nombre",
    "columnType": "Tipo",
    "columnActions": "Acciones"
  }
```

```json
// messages/en.json — extend the "Categories" namespace from Task 2
  "Categories": {
    "deleteError": "Cannot delete a category that still has transactions. Reassign or delete those transactions first.",
    "title": "Categories",
    "newCategory": "New category",
    "editCategory": "Edit category",
    "name": "Name",
    "typeExpense": "Expense",
    "typeIncome": "Income",
    "loading": "Loading categories…",
    "columnName": "Name",
    "columnType": "Type",
    "columnActions": "Actions"
  }
```

- [ ] **Step 6: Form dialog component**

```typescript
// src/features/categories/components/CategoryFormDialog.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import type { Category } from '../types'

const schema = z.object({
  name: z.string().min(1, 'Required').max(50),
  type: z.enum(['EXPENSE', 'INCOME']),
})
type FormValues = z.infer<typeof schema>

export function CategoryFormDialog({ category, trigger }: { category?: Category; trigger: React.ReactElement }) {
  const t = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { create, update } = useCategoryMutations()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? '', type: category?.type ?? 'EXPENSE' },
  })

  async function onSubmit(values: FormValues) {
    if (category) {
      await update.mutateAsync({ id: category.id, ...values })
    } else {
      await create.mutateAsync(values)
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? t('editCategory') : t('newCategory')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input placeholder={t('name')} {...form.register('name')} />
          <Select
            defaultValue={form.getValues('type')}
            onValueChange={(v) => form.setValue('type', v as 'EXPENSE' | 'INCOME')}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">{t('typeExpense')}</SelectItem>
              <SelectItem value="INCOME">{t('typeIncome')}</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 7: List component**

Row actions are solid icon buttons per the mockup (edit = solid accent, delete = solid destructive), and the delete-blocked error renders as an inline destructive `Alert`, not a bare paragraph.

```typescript
// src/features/categories/components/CategoryList.tsx
'use client'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCategories } from '../hooks/useCategories'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import { CategoryFormDialog } from './CategoryFormDialog'
import type { Category } from '../types'

export function CategoryList() {
  const t = useTranslations('Categories')
  const tCommon = useTranslations('Common.actions')
  const { data: categories, isLoading } = useCategories()
  const { remove } = useCategoryMutations()

  if (isLoading) return <p>{t('loading')}</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CategoryFormDialog trigger={<Button>{t('newCategory')}</Button>} />
      </div>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnName')}</TableHead>
              <TableHead>{t('columnType')}</TableHead>
              <TableHead className="text-right">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(categories as Category[] | undefined)?.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.type === 'EXPENSE' ? t('typeExpense') : t('typeIncome')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <CategoryFormDialog
                    category={category}
                    trigger={
                      <Button size="icon" aria-label={tCommon('edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label={tCommon('delete')}
                    onClick={() => remove.mutate(category.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {remove.isError && (
        <Alert variant="destructive">
          <AlertDescription>{(remove.error as Error).message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Page**

```typescript
// src/app/[locale]/(dashboard)/categories/page.tsx
import { getTranslations } from 'next-intl/server'
import { CategoryList } from '@/features/categories/components/CategoryList'

export default async function CategoriesPage() {
  const t = await getTranslations('Categories')
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <CategoryList />
    </div>
  )
}
```

- [ ] **Step 9: Manual verification**

Run `npm run dev`, sign in, visit `/es/categories`. Confirm: the 9 seeded categories render with translated type labels; the edit/delete row actions render as solid icon buttons (accent and destructive respectively), not ghost/outline; creating a new category adds a row; editing changes it; deleting a category with no transactions succeeds. Switch to `/en/categories` and confirm the page renders fully in English. Toggle dark mode and confirm the table/dialog remain legible. (The delete-blocked error path — rendered as a destructive `Alert` — can only be fully exercised once the Transactions plan lands, but the code path and its unit test already cover it.)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(categories): build categories management UI"
```

---

### Task 4: Open the PR to develop

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```
Expected: all pass (seed + actions tests from this plan).

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin feature/categories
gh pr create --base develop --title "Categories: seeding + CRUD + UI" --body "Implements docs/superpowers/specs/2026-07-11-categories-design.md. Depends on feature/foundation already merged. Enables the Transactions and Recurring Transactions branches to follow."
```
