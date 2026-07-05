# Categories — Design Spec

Date: 2026-07-04

## Purpose

Per-user expense/income categories: seeded with a starter set on signup,
then fully user-editable. Every other v1 subsystem (Transactions, Recurring
Transactions) depends on categories existing, so this is the first business
feature built after Foundation.

**Depends on:** Foundation (merged to `develop`) — uses the `Category` model,
`db` singleton, `requireSession()`, the shared `queryKeys` file, and the
TanStack QueryProvider already wired in the root layout.

## Data model

Uses the `Category` model already defined in Foundation's
`prisma/schema.prisma` (`id, userId, name, type, createdAt`, unique on
`[userId, name, type]`). No schema changes in this spec.

## Features

- **Seeding on signup**: a fixed starter set of categories (Market,
  Transport, Rent, Utilities, Entertainment, Health, Other — all EXPENSE;
  Salary, Other Income — INCOME) is cloned into a new user's own rows via a
  Better Auth `databaseHooks.user.create.after` hook.
- **CRUD**: list, create, edit, delete — a category has a name and a type
  (EXPENSE or INCOME).

## Error handling

- **Deletion is blocked** while any `Transaction` or `RecurringTransaction`
  references the category. The user gets a clear message telling them to
  reassign or delete those transactions first — enforced at the application
  layer (a friendly error) and backstopped at the DB layer
  (`onDelete: Restrict`, already set in Foundation's schema).

## Testing

- Unit test: `seedDefaultCategories` creates one row per default entry,
  scoped to the given user.
- Unit test: `deleteCategory` rejects (and does not delete) when
  transactions/recurring rules still reference the category; succeeds when
  nothing references it.
