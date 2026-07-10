# Handoff: Personal Finance Manager — Design System

## Overview

A complete visual design for the Personal Finance Manager app: a personal expense/income tracker (log transactions, categorize them, set up recurring entries, and see income/expense/savings across week/month/year in one base currency). This package hands off the visual system + screen designs to be implemented in `MATREYcr/personal-finance-manager`.

## About the design files

Everything in `reference/` is **HTML/CSS/React design references** — high-fidelity prototypes showing exact look, spacing, and behavior. They are **not production code to copy directly**. The task is to recreate these designs in the real codebase using **Tailwind CSS + shadcn/ui** (per the project's own tech constraint), reusing shadcn's existing primitives (Button, Card, Table, Tabs, Dialog, Select, Badge) configured with the tokens below — not hand-rolled CSS.

## Fidelity

**High-fidelity.** Colors, type, spacing, radii, and interaction states below are final — implement pixel-accurately.

## Design tokens → Tailwind / shadcn mapping

Source of truth: `reference/tokens/*.css` (CSS custom properties). Below is how they map onto a shadcn/Tailwind setup (`tailwind.config` theme extension + shadcn's CSS-variable convention in `globals.css`).

**Font**: Geist (all weights 400–800) for everything — headings, UI chrome, body copy. No secondary font. Google Fonts import in `tokens/typography.css`; use `next/font/google` or a `@font-face`/link in the real app.

**Color** (light mode default; dark mode = `[data-theme="dark"]` in the prototype → map to shadcn's `.dark` class convention):

- `--accent` `#7C3AED` (purple) → shadcn `--primary`. Alternates shipped as a Tweak: blue `#2563EB`, slate `#475569` (see `[data-accent]` blocks in `tokens/colors.css`) — pick one as the shipped default, keep others as a future theme option.
- `--accent-hover` `#6D28D9`, dark-mode accent `#9D6BFF`
- Neutrals (zinc scale): page bg `#F7F7F8` / card `#FFFFFF` / border `#E4E4E7` / input border `#D4D4D8` / muted text `#71717A` / primary text `#09090B`. Dark: page `#0A0A0B` / card `#161618` / sunken `#1C1C1F` / border `#27272A`.
- Semantic (kept separate from accent): positive/income `#15803D` (bg `#DCFCE7`, border `#BBF7D0`), negative/expense `#DC2626` (bg `#FEF2F2`, border `#FECACA`), warning/paused `#B45309` (bg `#FFFBEB`, border `#FDE68A`). Dark-mode variants are translucent overlays — see `tokens/colors.css`.
- Full values: `reference/tokens/colors.css`.

**Radius**: controls/inputs `8px`, cards/table containers `12px`, dialogs `14px`, badges/pills/switches `9999px` (full). See `reference/tokens/radius.css`.

**Shadow**: cards `0 1px 3px rgba(0,0,0,.04)`; buttons `0 1px 2px rgba(0,0,0,.12)`; active segmented-tab `0 1px 2px rgba(0,0,0,.10)`; dialogs `0 24px 60px rgba(0,0,0,.30)`. See `reference/tokens/shadows.css`.

**Type scale** (px): xs 11 · sm 12 · base 14 · md 15 · lg 17 · xl 18 · 2xl 24 · 3xl 30 · 4xl 40. **Every monetary figure must use `font-variant-numeric: tabular-nums`** (Tailwind: `tabular-nums` class) so amount columns align.

**Spacing**: 4px base unit. Table rows are generous — 56px row height, not the shadcn-default compact row.

## Interaction states (all components)

- **Hover** — filled buttons (primary/destructive): `filter: brightness(1.08)`. Neutral surfaces (outline/secondary/ghost/table rows): background shifts to the sunken/hover tint (no color change, no scale).
- **Press** — filled buttons only: `translateY(1px)`.
- **Focus** — every input/select/button: accent-colored border + a 3px soft accent ring (`box-shadow: 0 0 0 3px rgba(accent, .35)`).
- **Loading** — skeleton rows, 1.2s linear shimmer sweep (`reference/components/feedback/Skeleton.jsx`), not a spinner.
- **Dialogs** — pop in (`scale(.97)→1`, 180ms), scrim `rgba(0,0,0,.45)` + 2px backdrop blur.

## Screens

All screens live in `reference/ui_kit_app/*.jsx` (plain React, inline styles — read for exact layout/spacing/copy, don't copy the inline-style approach into the real app; use Tailwind classes instead).

1. **Auth** (`Auth.jsx`) — split screen ≥768px: left 42% panel, purple gradient (`135deg`/`160deg`, accent → dark violet), wordmark + headline "Know where your money goes." (weight 600, not 800/black) + 3 feature bullets with icon chips; right panel: centered card (border+shadow+14px radius) with Sign in / Sign up toggle, icon-prefixed email/password inputs, "Forgot?" link, primary CTA with trailing arrow icon, OR divider, secondary "Create an account" button. On mobile (<768px) the brand panel is hidden — form card only, centered.
2. **Dashboard** (`Dashboard.jsx`) — Week/Month/Year segmented Tabs top-right; 3 summary cards (Income/Expense/Savings) in a responsive grid, big tabular-nums figures, Savings card gets a subtle accent-tinted border; recent-transactions table below inside a Card.
3. **Transactions** (`Transactions.jsx`) — filter bar (Type select, Category select, Date-from, Date-to) + "New transaction" primary button; table with Date/Category/Type(badge)/Amount(tabular, colored +/−)/Actions; row actions are **solid colored icon buttons**: edit = solid accent bg + white icon, delete = solid red bg + white icon (not ghost/ outline — see Interaction states). "New transaction" opens a Dialog: Type, Category, Amount+Currency (side by side), Date, optional Note.
4. **Categories** (`Categories.jsx`) — table of Name/Type(badge)/Actions (same solid edit/delete icon buttons). Clicking Delete on a category with transactions shows an inline red-tinted alert row: _"Cannot delete a category that still has transactions. Reassign or delete those transactions first."_ "New category" Dialog: Name, Type.
5. **Recurring** (`Recurring.jsx`) — table of Category/Type(badge)/Amount/Frequency/Next run/Status(badge with dot)/Actions. Row actions: edit = solid accent, pause/resume = solid medium-gray (`#71717A`) when active / solid green when paused, delete = solid red. "New recurring transaction" Dialog adds Frequency + Start date to the transaction form.
6. **Settings** (`Settings.jsx`) — single Card, one field (Base currency, 3-letter code) + Save button, inline "Saved" confirmation text on click.
7. **Nav chrome** (`NavShell.jsx`) — desktop: left sidebar (240px) with nav links (active state = accent-tinted bg + 3px left accent border) and a user chip in the sidebar footer (gradient avatar initials, name, email in accent color, separate outlined sign-out icon button). A separate sticky **topbar** (60px, right-aligned) holds an EN/ES language segmented toggle and a light/dark theme toggle (sun/moon icon, bordered square button). Mobile (<768px): sidebar collapses into a top bar + slide-down drawer; same lang/theme toggles live in the mobile topbar; user chip moves into the drawer.

## State management

- `authed` (bool), `screen` (string enum), `period` (week/month/year), `theme` (light/dark), `lang` (en/es), `mobile` (bool, from viewport width <768px), `mobileOpen` (bool, drawer state) — all simple local state in the prototype; map 1:1 to whatever the real app's auth/router/theme-provider looks like.
- Category delete: local `deleteErrorId` toggles the inline error row — in production this should be driven by the actual "category has transactions" check from the API.
- Recurring pause/resume: toggles a `status` field per row.

## Assets

No logo was available from the source repo (it was empty at design time) — the wordmark is set in plain Geist type everywhere a mark would go. Icons are **Lucide** (MIT), loaded via CDN in the prototype (`unpkg.com/lucide@latest`) — in the real app, install `lucide-react` instead and swap `<i data-lucide="...">` for `<IconName />` components.

## Files

- `reference/tokens/` — all CSS custom properties (colors, typography, spacing, radius, shadows, base reset + keyframes)
- `reference/styles.css` — import chain, load this as the single entry point if referencing the tokens directly
- `reference/components/` — reference component implementations (Button, Input, Select, Label, Badge, Card, Table, Tabs, Dialog, Skeleton, Icon) — read for exact visual spec, reimplement using shadcn primitives + Tailwind
- `reference/ui_kit_app/` — the full click-through screen recreations (`index.html` to preview interactively, one `.jsx` per screen)

## Source

Design system built against the written prototype brief for `MATREYcr/personal-finance-manager` (the repo had no code at design time — spec only). Full design system with additional foundation cards lives in this project; ask for it again if useful during implementation.
