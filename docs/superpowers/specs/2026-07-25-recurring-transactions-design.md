# Recurring Transactions — Design Spec

Date: 2026-07-04

## Purpose

Let a user set up a transaction that repeats on a schedule (e.g. monthly
salary, monthly rent) instead of re-entering it by hand every period. A
daily cron job materializes each due rule into a real `Transaction` row.

**Depends on:** Foundation, Categories, and Transactions (all merged to
`develop`) — uses the `RecurringTransaction` model, `db`, `requireSession()`,
`queryKeys`, `useCategories()`, and reuses the Transactions feature's form
field set (category, type, amount, currency, note) plus two new fields
(frequency, start date). The generation cron creates real `Transaction` rows
directly, matching the exact shape Transactions' `queries.ts` already reads.

## Data model

Uses the `RecurringTransaction` model already defined in Foundation's
`prisma/schema.prisma` (`id, userId, categoryId, type, amount, currency,
frequency, nextRunDate, note?, active, createdAt`). No schema changes in
this spec. `Transaction.recurringId` (defined in Foundation, unused until
now) gets set by the generation cron in this spec.

## Features

- **CRUD**: list, create, edit, pause/resume (`active` toggle), delete.
- **Generation cron**: a daily Vercel Cron job finds all `active` rules
  where `nextRunDate <= today`, creates a real `Transaction` for each
  (linked via `recurringId`), and advances `nextRunDate` by the rule's
  frequency.

## Error handling

- **Editing a rule never retroactively changes past transactions.** Each
  generated `Transaction` stores its own copy of amount/category/currency
  at creation time — editing the rule only affects transactions generated
  *after* the edit.
- **The cron is safe to re-run.** Per rule, creating the `Transaction` and
  advancing `nextRunDate` happen atomically (one DB transaction) — so a
  retry after a partial failure never double-creates a transaction or
  skips advancing the schedule.

## Testing

- Unit tests for the generation logic: due-date detection (`nextRunDate <=
  now` and `active = true`), correct date advancement per frequency
  (WEEKLY = +7 days, MONTHLY = +1 month, YEARLY = +1 year), and that the
  query only selects active, due rules.
