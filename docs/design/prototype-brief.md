# Personal Finance Manager — Prototype Brief

Use this brief to design a high-fidelity visual prototype (not a low-fidelity wireframe) of this app's core screens. Structure and content are already decided (below) — what's open is the visual identity: palette, typography, spacing, and overall feel.

## One-liner

A personal, multi-user expense/income tracker: log transactions by hand, organize them into categories, set up recurring ones (like salary or rent), and see a dashboard of income/expense/savings per week, month, or year — with everything convertible into one home currency even when transactions come in different currencies.

## Who's using it & how

One person (eventually maybe their household) checking in periodically — a few times a week, not constantly. It replaces a spreadsheet. The tone should feel calm, trustworthy, and precise (this is about someone's money), not playful or gamified, and not sterile/corporate either — it's a personal tool, not enterprise SaaS.

## Tech constraint

The real build uses Tailwind CSS + shadcn/ui components (cards, tables, dialogs, tabs, selects, badges, buttons). Keep the prototype achievable with those primitives — avoid layouts or components (e.g. complex custom charts, exotic navigation patterns) that don't map cleanly back to that toolkit, since this prototype's job is to be rebuilt in code afterward.

## Suggested visual direction (a starting point — feel free to push back on it)

- **Color**: A muted deep indigo/ink (`#1F2A44`) as the single accent — used sparingly (primary buttons, active nav state, active tab). Ground: warm off-white (`#F7F5F0`) in light mode, deep warm charcoal (`#16151A`) in dark mode — neither pure white/black nor a cliché cream. Semantic colors are separate from the accent: a muted forest green (`#2F6E4F`) for positive/income/savings, a muted brick red (`#B3453A`) for negative/expense — desaturated enough to sit quietly next to the accent, not neon.
- **Type**: A grounded humanist sans for UI text and headings (something like Inter/Public Sans territory, but pick a specific characterful pairing rather than defaulting to Inter) — plus `font-variant-numeric: tabular-nums` on every monetary figure so amounts align in columns. Avoid a display serif; this is a numbers-forward utility tool, not an editorial piece.
- **Layout**: Left-side nav (collapses to a top bar on mobile) + content area. Dashboard leads with the three summary numbers front and center (income/expense/savings), scanned at a glance before any table. Tables get generous row height and right-aligned, tabular-nums amounts.

## Screens to design

### 1. Sign in / Sign up
Simple centered card. Sign in: email + password. Sign up: name + email + password. Nothing fancy — this is a utility gate, not a marketing moment.

### 2. Dashboard (the home screen after login)
- A period switcher: **Week / Month / Year** tabs.
- Three summary figures for the selected period, in the user's base currency: **Income**, **Expense**, **Savings** (income − expense; show it visually distinct when negative vs positive).
- Sample data to design against (Month, base currency USD):
  - Income: `3,200.00 USD`
  - Expense: `2,140.50 USD`
  - Savings: `1,059.50 USD`

### 3. Transactions
- Filter bar: **Type** (All / Expense / Income), **Category** (dropdown), **Date from**, **Date to**.
- A table: Date · Category · Type · Amount (with currency code) · row actions (Edit / Delete).
- A "New transaction" action opens a form: Type, Category (select), Amount, Currency (3-letter code), Date, Note (optional).
- Sample rows to design against:
  | Date | Category | Type | Amount |
  |---|---|---|---|
  | 2026-07-01 | Salary | Income | 3,000.00 USD |
  | 2026-07-02 | Market | Expense | 84.30 USD |
  | 2026-07-03 | Transport | Expense | 42.00 EUR |
  | 2026-07-04 | Entertainment | Expense | 25.99 USD |

### 4. Categories
- A simple table: Name · Type (Expense/Income) · row actions (Edit / Delete).
- A "New category" action opens a small form: Name, Type.
- Sample rows: Market (Expense), Transport (Expense), Rent (Expense), Utilities (Expense), Entertainment (Expense), Health (Expense), Other (Expense), Salary (Income), Other Income (Income).
- Design the delete action so it can show an inline error state: *"Cannot delete a category that still has transactions. Reassign or delete those transactions first."*

### 5. Recurring transactions
- A table: Category · Type · Amount · Frequency (Weekly/Monthly/Yearly) · Next run date · Status (**Active** / **Paused** badge) · row actions (Edit / Pause-Resume / Delete).
- A "New recurring transaction" action opens a form: same fields as a transaction, plus Frequency and a Start date.
- Sample row: Salary · Income · 3,000.00 USD · Monthly · Next run 2026-08-01 · Active.

### 6. Settings
- One field: **Base currency** (3-letter code input), with a Save action. Minimal — this is a single-setting page.

## Navigation

Persistent nav across all authenticated screens: **Dashboard · Transactions · Categories · Recurring · Settings**, plus a **Sign out** action. Must be responsive — collapse to a compact top bar or drawer on mobile, not a fixed sidebar that breaks below ~768px.

## States to account for

- Empty states (e.g. no transactions yet, no recurring rules yet) — should invite the first action, not just show a blank table.
- The category-delete error above.
- Loading state for tables (skeleton or spinner — keep it subtle).

## Deliverable

Desktop and mobile treatments for at least: Dashboard, Transactions (with filters + the new-transaction form open), and Categories (showing the delete-blocked error state). The other screens (Recurring, Settings, Auth) follow the same system but don't need separate exploration if the pattern is established by the three above.
