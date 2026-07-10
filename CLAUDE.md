@AGENTS.md

# Personal Finance Manager

Multi-currency expense/income tracker. Next.js 16 (App Router, Cache
Components), Prisma + Supabase Postgres, Better Auth, TanStack Query,
next-intl, next-themes, shadcn/ui (on Base UI). Spanish default, English
secondary; light/dark mode.

## Comments

Write no comments except the strictly necessary. Only comment when the code
cannot explain itself — a non-obvious constraint, a workaround, or a "why"
that would otherwise be lost (e.g. `// Coerce Decimal -> number: Flight can't
serialize Prisma Decimal`). Never restate what the code already says. Prefer
clear names over explanatory comments.

## Code style

- TypeScript, single quotes, no semicolons, 2-space indent (Prettier enforces).
- Import from `@/...` (tsconfig path alias), never long relative chains.
- Validate every server-action input with Zod; parse before use.
- Never return Prisma `Decimal` across the server boundary — coerce to `number`.

## Structure

- `src/features/<feature>/` — one folder per feature. Inside:
  - `actions.ts` (`'use server'`) — mutations; guard with `requireSession()`.
  - `queries.ts` (`'use cache'`) — reads; tag with `cacheTag(CACHE_TAGS.*)`.
  - `components/`, `hooks/`, `types.ts`, `*.test.ts` colocated.
- `src/app/[locale]/` — thin route files; delegate to features.
- `src/lib/` — shared `auth`, `db`, `currency`, `query`, `constants`, `validations`.
- `src/components/ui/` — shadcn primitives; do not hand-roll Tailwind for these.

## Data & cache

- Mutations call `updateTag(CACHE_TAGS.*)` after writing; queries `cacheTag` the same tag.
- Cache tags live in `src/lib/constants/cache-tags.ts` — reuse, don't inline strings.

## i18n

- All user-facing strings via next-intl; no hardcoded copy in components.
- One top-level namespace per feature in `messages/es.json` and `messages/en.json`.
  Keep both catalogs in sync when adding keys.

## Verify before done

```bash
npm test          # Vitest
npx tsc --noEmit  # types
npm run lint      # ESLint
```

Run `npm run dev` from PowerShell/cmd, not Git Bash (Turbopack `0xc0000142`).
