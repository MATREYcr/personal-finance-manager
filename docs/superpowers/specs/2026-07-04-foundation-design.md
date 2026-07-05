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
- **next-themes** — light/dark mode
- **next-intl** — internationalization (Spanish + English)
- Vercel (hosting + Cron jobs)
- Vitest (unit tests)

Follows `next-stack` conventions: `app/` contains only routing files;
business logic lives in `features/<domain>/` folders. Feature folders this
foundation does *not* populate (`categories`, `transactions`,
`recurring-transactions`, `dashboard`, `settings`) are created by their own
specs.

## Visual design system

A high-fidelity mockup lives at `docs/design/` (`README.md` + `reference/`)
and is the **source of truth for how the app looks** — colors, type,
spacing, radii, shadows, and interaction states. The reference files
(`reference/components/*.jsx`, `reference/ui_kit_app/*.jsx`) are HTML/CSS/
React prototypes, not code to copy verbatim — every screen is rebuilt with
real shadcn/ui + Tailwind, matching the mockup's *look*, not its inline-style
implementation. Key values (full detail in `docs/design/README.md` and
`docs/design/reference/tokens/*.css`):

- **Font**: Geist (weights 400–800) for everything, loaded via
  `next/font/google` — no secondary font.
- **Accent**: purple `#7c3aed` light / `#9d6bff` dark → shadcn's `--primary`.
- **Neutrals**: page bg `#f7f7f8` / card `#ffffff` / border `#e4e4e7` /
  muted text `#71717a` / primary text `#09090b` (light). Dark: page
  `#0a0a0b` / card `#161618` / sunken `#1c1c1f` / border `#27272a`.
- **Semantic colors** (kept separate from the accent): positive/income
  `#15803d` (bg `#dcfce7`), negative/expense → shadcn's `--destructive`
  `#dc2626` (bg `#fef2f2`), warning/paused `#b45309` (bg `#fffbeb`). Dark
  mode uses translucent overlay variants — see `tokens/colors.css`.
- **Radius**: controls/inputs `8px`, cards/tables `12px`, dialogs `14px`,
  badges/pills `9999px` (full).
- **Shadows**: quiet and close — cards `0 1px 3px rgba(0,0,0,.04)`, dialogs
  `0 24px 60px rgba(0,0,0,.30)`.
- **Type scale**: xs 11 · sm 12 · base 14 · md 15 · lg 17 · xl 18 · 2xl 24 ·
  3xl 30 · 4xl 40 (px). Every monetary figure uses `tabular-nums`.
- **Row height**: tables are generous (56px rows), not shadcn's compact
  default.
- **Interaction states**: filled buttons brighten on hover and shift down
  1px on press; every focusable control gets an accent border + 3px soft
  ring; loading state is a skeleton shimmer, never a spinner; dialogs pop in
  (`scale(.97)→1`, 180ms) over a blurred scrim.
- **Nav chrome**: desktop = 240px left sidebar (active link = accent-tinted
  background + 3px left accent border) with a user chip (initials avatar +
  sign-out) in the footer, plus a separate 60px topbar holding an EN/ES
  language toggle and the light/dark theme toggle. Mobile (<768px): sidebar
  collapses into a topbar + slide-down drawer; the same language/theme
  toggles live in the mobile topbar.
- **Row actions in tables** are solid icon buttons, not ghost/outline:
  edit = solid accent, delete = solid destructive, pause = solid neutral,
  resume = solid positive — all achievable with shadcn's existing Button
  variants (`default`, `destructive`, `secondary`) plus the positive token
  for resume, each rendered `size="icon"` with a Lucide icon instead of a
  text label.
- **Savings card** on the dashboard gets a subtle accent-tinted border, and
  its figure uses the positive/negative semantic tokens, not an ad hoc
  color.
- **Category delete-blocked error** renders as an inline destructive Alert
  (shadcn's `Alert` component), not a bare paragraph.
- **Settings save** shows a brief inline "Saved" confirmation next to the
  button, not just the button returning to its resting state.

Every downstream spec (Categories, Transactions, Recurring Transactions,
Currency/FX/Dashboard) must apply these tokens/patterns for its own screens
and components — this is not optional polish, it's the agreed visual spec.

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
- **Light/dark mode**: system-preference by default, with a manual toggle
  (light/dark/system) available from the nav. Every later feature must
  style with shadcn's theme-aware Tailwind tokens (`bg-background`,
  `text-muted-foreground`, `text-destructive`, etc.) rather than hardcoded
  colors, so it works in both themes without extra work.
- **Internationalization (Spanish + English)**: every route lives under a
  `[locale]` URL segment (`/es/dashboard`, `/en/dashboard`); Spanish is the
  default locale, English the second. All user-facing text goes through
  `next-intl` translation keys — no hardcoded UI strings in any later
  feature. Message catalogs live in `messages/es.json` and
  `messages/en.json`, one top-level namespace per feature (this spec owns
  `Common` and `Auth`).

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
- Each downstream spec adds its own top-level namespace to
  `messages/es.json` / `messages/en.json` (e.g. `Categories`,
  `Transactions`, `RecurringTransactions`, `Dashboard`, `Settings`) and its
  routes live under `src/app/[locale]/...` — this Foundation is what makes
  that structure exist in the first place.
