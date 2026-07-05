# Currency, FX & Dashboard — Design Spec

Date: 2026-07-04

## Purpose

Turn raw transactions into the thing the user actually opened the app for:
"how much did I save this week/month/year" — as one number, even when
transactions were entered in different currencies. Covers currency
conversion, the daily FX-rate refresh, the dashboard itself, and the
base-currency setting. This is the last v1 subsystem — its final task also
runs the full cross-subsystem integration check and opens the release PR.

**Depends on:** Foundation and Transactions (both merged to `develop`).
Does **not** depend on Recurring Transactions — the dashboard reads whatever
`Transaction` rows exist regardless of how they were created, so this
branch can be built in parallel with Recurring Transactions if a team
wanted to split the work that way. All UI text goes through this feature's
own `Dashboard` and `Settings` namespaces in `messages/es.json` /
`messages/en.json`; all styling uses theme-aware Tailwind tokens (including
the savings figure's positive/negative color, which must remain legible in
both light and dark mode). Routes live under `src/app/[locale]/...`.

## Data model

Uses the `ExchangeRate` model already defined in Foundation's
`prisma/schema.prisma` (`id, targetCurrency, rate, fetchedAt`) and the
`User.baseCurrency` field (also from Foundation). No schema changes in this
spec.

## Features

- **Currency conversion**: convert an amount from any currency to any other
  via a fixed pivot currency (USD), given a rate table.
- **FX rate refresh**: a daily Vercel Cron job fetches current rates from a
  free FX API and upserts one row per currency into `ExchangeRate`.
- **Dashboard**: a period switcher (week/month/year) showing income,
  expense, and net savings for the selected period, all converted to the
  user's base currency.
- **Settings**: set/change the user's `baseCurrency`.

## Error handling

- **FX fetch failure**: if the daily rate fetch fails or a currency isn't
  supported, the existing `ExchangeRate` row is left untouched — the
  dashboard always uses the most recently successfully-fetched rate rather
  than blocking on a failure.
- **Missing rate**: converting to/from a currency with no stored rate
  throws a clear error naming the missing currency, rather than silently
  producing a wrong number.

## Testing

- Unit tests for `convertAmount`: same-currency passthrough, pivot→other,
  other→pivot, cross-currency (neither side is the pivot), and the
  missing-rate error case.
- Unit tests for the period-range calculation (week/month/year boundaries)
  and for the pure income/expense/savings summation, independent of any
  database.
- Unit tests for the FX refresh function: upserts one row per non-pivot
  currency on success; updates nothing and reports the failure on an API
  error, without throwing.

## v1 completion

Once this subsystem's PR merges, all five v1 subsystems (Foundation,
Categories, Transactions, Recurring Transactions, Currency/FX/Dashboard)
are on `develop` together — this is what "v1 done" means. The final task in
this subsystem's plan runs a full walkthrough exercising every subsystem
together, since by then all of them exist.
