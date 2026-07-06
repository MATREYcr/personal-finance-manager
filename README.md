# Personal Finance Manager

Personal expense/income tracker with per-user categories, recurring
transactions, and a multi-currency dashboard. Available in Spanish
(default) and English, with light/dark mode.

Built with Next.js 16 (App Router, Cache Components), Prisma + Supabase
Postgres, Better Auth, TanStack Query, next-intl, next-themes, and
shadcn/ui (on Base UI).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — Supabase transaction-mode pooler URL (port 6543), used by the app at runtime
   - `DIRECT_URL` — Supabase session-mode pooler URL (port 5432), used by the Prisma CLI for migrations
   - `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` in dev)
   - `CRON_SECRET` (any random string, 16+ characters)
3. `npx prisma migrate deploy`
4. `npm run dev`

> **Windows note:** launch `npm run dev` from PowerShell or cmd.exe, not Git
> Bash — Turbopack crashes (`0xc0000142`) when a route compiles CSS if the dev
> server was started from Git Bash.

## Internationalization

Routes are locale-prefixed (`/es/...`, `/en/...`), Spanish is the default.
Message catalogs live in `messages/es.json` and `messages/en.json`, one
top-level namespace per feature (`Common`, `Auth`, `Categories`,
`Transactions`, `RecurringTransactions`, `Dashboard`, `Settings`).

## Cron jobs (production, via `vercel.json`)

- `/api/cron/fx-rates` — daily exchange-rate refresh (06:00 UTC)
- `/api/cron/recurring-transactions` — daily recurring-transaction generation (07:00 UTC)

Both are guarded by a `Bearer ${CRON_SECRET}` Authorization header.

## Testing

```bash
npm test          # Vitest unit tests
npx tsc --noEmit  # type check
npm run lint      # ESLint
npm run build     # production build
```

## v1 subsystems

Built as five sequential branches, each with its own spec + plan under
`docs/superpowers/`: Foundation → Categories → Transactions → Recurring
Transactions → Currency/FX/Dashboard.

## Phase 2

A Telegram bot (Vercel AI SDK) for natural-language transaction entry is
planned separately as its own spec once this v1 is stable.
