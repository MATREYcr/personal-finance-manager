# Personal Finance Manager — Design Spec

Date: 2026-07-04

## Purpose

A personal finance web app to track expenses and income, categorize spending,
and see how much money is saved per week/month/year. Built as a multi-user
app from the start (not just for the author), with room to grow.

**Explicitly out of scope for this spec:** a Telegram bot with an AI agent
(Vercel AI SDK) that lets a user text natural-language transactions (e.g. "I
spent $100 on market") and have them auto-logged. This is a planned phase 2
and will get its own design spec once this phase is built and stable.

## Stack

- Next.js 15 (App Router)
- Supabase (PostgreSQL)
- Prisma ORM
- Better Auth (authentication, users stored in the app's own DB via Prisma)
- TanStack Query (server state)
- Zustand (UI state only)
- Tailwind CSS + shadcn/ui
- Vercel (hosting + Cron jobs)

This follows the existing `next-stack` conventions: `app/` contains only
routing files, business logic lives in `features/<domain>/` folders
(`components/`, `hooks/`, `queries.ts`, `actions.ts`, `types.ts`).

Feature folders: `features/auth`, `features/categories`,
`features/transactions`, `features/recurring-transactions`,
`features/dashboard`, `features/settings`.

## Data model (Prisma)

### User (extends Better Auth's user table)
- Standard Better Auth fields (id, email, name, etc.)
- `baseCurrency: String` — default `"USD"`. Used to convert all totals on
  the dashboard into one comparable number.

### Category
- `id, userId, name, type (EXPENSE | INCOME), createdAt`
- Per-user, not global. On signup, a seed routine clones a default starter
  set (e.g. Market, Transport, Rent, Utilities, Salary, Other) into that
  user's own rows. From there the user can freely create/edit/delete their
  own categories.
- **Deletion rule:** a category cannot be deleted while any `Transaction`
  references it. The user must reassign or delete those transactions first.

### Transaction
- `id, userId, categoryId, type (EXPENSE | INCOME), amount (Decimal),
  currency (String, e.g. "USD"), date, note?, recurringId? (FK, nullable),
  createdAt`
- Represents a single manually-entered expense or income event. There is
  no separate "salary" concept — recurring income like salary is just a
  `Transaction` with `type = INCOME`, generated automatically when it comes
  from a `RecurringTransaction`.

### RecurringTransaction
- `id, userId, categoryId, type (EXPENSE | INCOME), amount (Decimal),
  currency, frequency (WEEKLY | MONTHLY | YEARLY), nextRunDate, note?,
  active (Boolean), createdAt`
- A daily Vercel Cron job finds all `active` rules where `nextRunDate <=
  today`, creates a real `Transaction` row for each (linked via
  `recurringId`), and advances `nextRunDate` by the rule's frequency.
- Editing a `RecurringTransaction`'s amount/category only affects
  transactions generated *after* the edit. Previously generated
  transactions are historical records and are never retroactively changed.

### ExchangeRate
- `id, targetCurrency (String), rate (Decimal, relative to a fixed pivot
  currency, e.g. USD), fetchedAt`
- A daily Vercel Cron job fetches current rates from a free FX API (e.g.
  Frankfurter or exchangerate-api) and upserts one row per currency.
- If the fetch fails for a currency (API error or unsupported currency),
  the existing row is left untouched — the dashboard always uses the most
  recent successfully-fetched rate rather than blocking on a failure.

## Features / Pages

### Auth
Sign up, sign in, sign out via Better Auth. All data is scoped to the
authenticated user; no cross-user visibility.

### Categories
List, create, edit, delete (subject to the deletion rule above). Each
category has a name and a type (EXPENSE or INCOME).

### Transactions
- List view: filterable by category, date range, and type (EXPENSE/INCOME).
- Create / edit / delete a transaction: type, category, amount, currency,
  date, optional note.

### Recurring Transactions
List, create, edit, pause/resume (`active` toggle), delete. Same fields as
a transaction plus `frequency` and `nextRunDate`.

### Dashboard
- Period switcher: week / month / year.
- For the selected period, computed on the fly from the `Transaction`
  table (nothing is pre-aggregated or stored):
  - `income` = sum of INCOME transactions in the period, each converted
    from its own currency to the user's `baseCurrency` via the latest
    `ExchangeRate` rows.
  - `expense` = sum of EXPENSE transactions in the period, same conversion.
  - `savings = income - expense`.

### Settings
Set/change the user's `baseCurrency`.

## Error handling

- FX rate fetch failures: logged, never block the dashboard; last-known
  rate is reused.
- Recurring transaction generation failures (e.g. DB error mid-run): the
  cron job should be safe to re-run — a rule's `nextRunDate` is only
  advanced after its `Transaction` is successfully created, so a retry
  won't double-create or skip an occurrence.
- Category deletion attempts while transactions reference it: rejected
  with a clear error telling the user to reassign/delete those
  transactions first.

## Testing

- Unit tests for the dashboard aggregation logic (income/expense/savings
  computation and currency conversion), since it's the core value of the
  app and easy to get subtly wrong (period boundaries, currency rounding).
- Unit tests for the recurring-transaction cron logic (due-date detection,
  idempotency on retry, `nextRunDate` advancement per frequency).
- Basic integration/UI tests for transaction and category CRUD flows.

## Phase 2 (not part of this spec)

- Telegram bot integration using the Vercel AI SDK: an agent that parses
  natural-language messages (e.g. "I spent $100 on market") sent to a
  Telegram bot and creates the corresponding `Transaction` automatically.
  This will require its own design spec covering intent parsing, category
  matching, confirmation flow, and how the bot authenticates to a specific
  user's account.
