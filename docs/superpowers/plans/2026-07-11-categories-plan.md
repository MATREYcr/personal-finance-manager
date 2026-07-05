# Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed default categories on signup and build full CRUD (queries, actions, UI) for per-user categories, with a delete guard that blocks removing a category still in use.

**Architecture:** `src/features/categories/` holds queries.ts (cached reads), actions.ts (Server Action writes), a seeding module wired into Better Auth's signup hook, hooks/ + components/ for the client UI.

**Tech Stack:** Next.js 15, Prisma, Zod, TanStack Query, react-hook-form, shadcn/ui, Vitest.

**Branch:** `feature/categories`, created from `develop` **after** `feature/foundation` is merged. PR target: `develop`.

## Global Constraints

- Package manager is npm.
- Every Server Action validates input with Zod and scopes by the authenticated `userId` — never trust a client-supplied user id.
- `queries.ts` uses `'use cache'` + `cacheTag('categories')`; `actions.ts` mutations call `revalidateTag('categories')` after a successful write.
- Category deletion is blocked (friendly error) while any `Transaction` or `RecurringTransaction` references it — this plan can only test the empty-reference case for transactions/recurring counts (those tables have no real feature yet), but the guard logic and its test must be written now since Categories ships before Transactions.

## Prerequisites (from Foundation, already merged)

- `db` singleton at `@/lib/db`.
- `requireSession()` at `@/lib/auth/session`.
- `Category` model in `prisma/schema.prisma` (via `@prisma/client`).
- `queryKeys` at `@/lib/query/keys` (this plan adds a `categories` key to it).
- `<QueryProvider>` already wired in `src/app/layout.tsx`.
- shadcn components already installed: button, input, label, card, dialog, form, table, select, tabs, badge.
- `src/app/(dashboard)/layout.tsx` nav already links to `/categories`.

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
src/app/(dashboard)/categories/page.tsx
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
          await seedDefaultCategories(db, user.id)
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

```typescript
// src/features/categories/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRequireSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))

const mockDb = {
  category: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  transaction: { count: vi.fn() },
  recurringTransaction: { count: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { deleteCategory } from './actions'

describe('deleteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('throws and does not delete when transactions still reference the category', async () => {
    mockDb.transaction.count.mockResolvedValue(2)
    mockDb.recurringTransaction.count.mockResolvedValue(0)

    await expect(deleteCategory('cat-1')).rejects.toThrow(/still has transactions/i)
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

- [ ] **Step 6: Write actions.ts**

```typescript
// src/features/categories/actions.ts
'use server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
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

  revalidateTag('categories')
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

  revalidateTag('categories')
  return category
}

export async function deleteCategory(categoryId: string) {
  const session = await requireSession()

  const [transactionCount, recurringCount] = await Promise.all([
    db.transaction.count({ where: { categoryId, userId: session.user.id } }),
    db.recurringTransaction.count({ where: { categoryId, userId: session.user.id } }),
  ])

  if (transactionCount > 0 || recurringCount > 0) {
    throw new Error(
      'Cannot delete a category that still has transactions. Reassign or delete those transactions first.'
    )
  }

  await db.category.delete({ where: { id: categoryId, userId: session.user.id } })
  revalidateTag('categories')
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- actions.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

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
- Create: `src/app/(dashboard)/categories/page.tsx`

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

- [ ] **Step 5: Form dialog component**

```typescript
// src/features/categories/components/CategoryFormDialog.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

export function CategoryFormDialog({ category, trigger }: { category?: Category; trigger: React.ReactNode }) {
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input placeholder="Name" {...form.register('name')} />
          <Select
            defaultValue={form.getValues('type')}
            onValueChange={(v) => form.setValue('type', v as 'EXPENSE' | 'INCOME')}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6: List component**

```typescript
// src/features/categories/components/CategoryList.tsx
'use client'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCategories } from '../hooks/useCategories'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import { CategoryFormDialog } from './CategoryFormDialog'
import type { Category } from '../types'

export function CategoryList() {
  const { data: categories, isLoading } = useCategories()
  const { remove } = useCategoryMutations()

  if (isLoading) return <p>Loading categories…</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CategoryFormDialog trigger={<Button>New category</Button>} />
      </div>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(categories as Category[] | undefined)?.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.type}</TableCell>
                <TableCell className="text-right space-x-2">
                  <CategoryFormDialog category={category} trigger={<Button variant="outline" size="sm">Edit</Button>} />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove.mutate(category.id)}
                    disabled={remove.isPending}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {remove.isError && (
        <p className="text-sm text-destructive">{(remove.error as Error).message}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Page**

```typescript
// src/app/(dashboard)/categories/page.tsx
import { CategoryList } from '@/features/categories/components/CategoryList'

export default function CategoriesPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">Categories</h1>
      <CategoryList />
    </div>
  )
}
```

- [ ] **Step 8: Manual verification**

Run `npm run dev`, sign in, visit `/categories`. Confirm: the 9 seeded categories render; creating a new category adds a row; editing changes it; deleting a category with no transactions succeeds (the delete-blocked error path can only be fully exercised once the Transactions plan lands, but the code path and its unit test already cover it).

- [ ] **Step 9: Commit**

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
