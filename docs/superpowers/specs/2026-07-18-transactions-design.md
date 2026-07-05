# Transactions — Design Spec

Date: 2026-07-04

## Purpose

Manual expense/income entry: the core of the app. Every transaction belongs
to a category and carries its own currency, so it can be aggregated later
(by the Currency/FX/Dashboard subsystem) regardless of what currency it was
entered in.

**Depends on:** Foundation and Categories (both merged to `develop`) — uses
the `Transaction` model, `db`, `requireSession()`, `queryKeys`, the
`useCategories()` hook / category-select pattern already built, the
`[locale]` routing structure, and next-themes. All UI text goes through
this feature's own `Transactions` namespace in `messages/es.json` /
`messages/en.json`; all styling uses theme-aware Tailwind tokens.

## Data model

Uses the `Transaction` model already defined in Foundation's
`prisma/schema.prisma` (`id, userId, categoryId, type, amount, currency,
date, note?, recurringId?, createdAt`). No schema changes in this spec.
`recurringId` stays unused (always null) until the Recurring Transactions
subsystem lands — this plan never sets it.

## Features

- **List**: filterable by category, type (expense/income), and date range.
- **CRUD**: create, edit, delete a transaction — type, category, amount,
  currency, date, optional note.

## Error handling

- Creating/editing a transaction with a `categoryId` that doesn't belong to
  the authenticated user is rejected — categories are per-user, and a
  client could otherwise submit an arbitrary id.

## Testing

- Unit test: `createTransaction` rejects a category that doesn't belong to
  the current user; succeeds and persists correctly when it does.
