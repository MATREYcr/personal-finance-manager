# Foundation — Design Spec

Date: 2026-07-04

## Purpose

Shared technical foundation for the Personal Finance Manager: project scaffold,
authentication, the complete domain data model, and the protected app shell.
No business features (categories, transactions, dashboard, etc.) live here —
this exists so every subsequent feature can be built independently, in
parallel, against a stable, already-decided schema and auth layer.

This is the first of five subsystems for v1 (Foundation → Categories →
Transactions → Recurring Transactions → Currency/FX/Dashboard). Each gets its
own spec + plan + branch + PR. The domain data model is decided in full here
— not spread across later specs — because `prisma/schema.prisma` is the
highest-collision shared resource in this project; deciding it once upfront
lets every later feature branch add its own files without editing the same
schema in parallel.

## Stack

- Next.js 15 (App Router)
- Supabase (PostgreSQL)
- Prisma ORM
- Better Auth (authentication, users stored in the app's own DB via Prisma)
- TanStack Query (server state) — provider wired here, used by every feature
- Zustand — part of the stack for cross-component UI state; not used unless
  a later feature genuinely needs it (no such need identified yet)
- Tailwind CSS + shadcn/ui
- Vercel (hosting + Cron jobs)
- Vitest (unit tests)

Follows `next-stack` conventions: `app/` contains only routing files;
business logic lives in `features/<domain>/` folders. Feature folders this
foundation does *not* populate (`categories`, `transactions`,
`recurring-transactions`, `dashboard`, `settings`) are created by their own
specs.

## Data model (Prisma) — decided in full here

### User (extends Better Auth's user table)
- Standard Better Auth fields (id, email, name, etc.)
- `baseCurrency: String` — default `"USD"`. Used later by the dashboard to
  convert all totals into one comparable number.

### Category
- `id, userId, name, type (EXPENSE | INCOME), createdAt`
- Per-user, not global. (Seeding on signup and CRUD belong to the Categories
  spec — this spec only decides the shape of the table.)

### Transaction
- `id, userId, categoryId, type (EXPENSE | INCOME), amount (Decimal),
  currency (String), date, note?, recurringId? (FK, nullable), createdAt`

### RecurringTransaction
- `id, userId, categoryId, type (EXPENSE | INCOME), amount (Decimal),
  currency, frequency (WEEKLY | MONTHLY | YEARLY), nextRunDate, note?,
  active (Boolean), createdAt`

### ExchangeRate
- `id, targetCurrency (String), rate (Decimal, relative to a fixed pivot
  currency, e.g. USD), fetchedAt`

(Full field-level rationale — deletion rules, cron behavior, conversion
math — lives in the Categories, Recurring Transactions, and Currency/FX/
Dashboard specs respectively, since that's business logic, not schema.)

## Features

- **Auth**: sign up, sign in, sign out via Better Auth (email/password).
  All data scoped to the authenticated user.
- **Protected app shell**: a persistent nav shared by every authenticated
  page, redirect-to-sign-in middleware for protected routes, and a root
  page that redirects to `/dashboard`.
- **Shared client infrastructure**: TanStack QueryClientProvider in the root
  layout, a shared `queryKeys` file that later features extend, shadcn/ui
  components installed.

## Error handling

Not applicable at this layer — no business logic exists yet. (Auth errors
are handled by Better Auth's own built-in error responses, surfaced as-is
in the sign-in/sign-up forms.)

## Testing

Not applicable at this layer — no business logic to unit test. Verification
here is manual: the app boots, sign-up/sign-in work, and the Prisma schema
migrates cleanly.

## Downstream specs

- Categories, Transactions, Recurring Transactions, and Currency/FX/
  Dashboard each assume this Foundation is merged to `develop` before their
  own branch starts.
