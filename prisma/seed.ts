/**
 * Database seed — populates the demo account (demo@finance.local / Demo1234!)
 * with realistic multi-currency data. Run with `npm run db:seed`. Idempotent:
 * wipes the demo user and its data first, never touching other users' rows.
 */
import { config } from 'dotenv'
// Load .env.local before anything reads process.env. `@/lib/db` and `@/lib/auth`
// connect at module-load time, so they're imported dynamically inside main() —
// a static top-level import would hoist above this config() call and connect
// with an undefined DATABASE_URL.
config({ path: '.env.local' })

import type { TransactionType } from '@prisma/client'

type DbClient = (typeof import('@/lib/db'))['db']

const DEMO = {
  email: 'demo@finance.local',
  password: 'Demo1234!',
  name: 'Demo User',
} as const

// USD-pivot rates (target units per 1 USD); the FX cron populates these in
// production. Static here to keep local conversions deterministic and offline.
const EXCHANGE_RATES: Record<string, number> = {
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.0,
  CAD: 1.37,
  MXN: 18.5,
  COP: 4100.0,
}

const now = new Date()
function daysAgo(n: number): Date {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(12, 0, 0, 0)
  return d
}
function daysFromNow(n: number): Date {
  return daysAgo(-n)
}

// `category` must match a default-seeded category name.
type SeedTx = {
  category: string
  type: TransactionType
  amount: number
  currency: string
  daysAgo: number
  note?: string
}

// Spread across week/month/year to exercise every dashboard period and overflow
// the 20-row page; income stays above expense so savings read positive.
const TRANSACTIONS: SeedTx[] = [
  // --- current week ---
  { category: 'Salary', type: 'INCOME', amount: 3500, currency: 'USD', daysAgo: 1, note: 'Monthly paycheck' },
  { category: 'Market', type: 'EXPENSE', amount: 82.4, currency: 'USD', daysAgo: 0 },
  { category: 'Transport', type: 'EXPENSE', amount: 18, currency: 'USD', daysAgo: 2 },
  { category: 'Entertainment', type: 'EXPENSE', amount: 45, currency: 'EUR', daysAgo: 3, note: 'Concert tickets' },
  { category: 'Market', type: 'EXPENSE', amount: 30.5, currency: 'GBP', daysAgo: 4 },
  // --- earlier this month ---
  { category: 'Rent', type: 'EXPENSE', amount: 1200, currency: 'USD', daysAgo: 9, note: 'Apartment' },
  { category: 'Utilities', type: 'EXPENSE', amount: 140.2, currency: 'USD', daysAgo: 10 },
  { category: 'Health', type: 'EXPENSE', amount: 60, currency: 'USD', daysAgo: 12 },
  { category: 'Other Income', type: 'INCOME', amount: 400, currency: 'EUR', daysAgo: 13, note: 'Freelance' },
  { category: 'Market', type: 'EXPENSE', amount: 76.9, currency: 'USD', daysAgo: 15 },
  { category: 'Transport', type: 'EXPENSE', amount: 25, currency: 'USD', daysAgo: 18 },
  { category: 'Entertainment', type: 'EXPENSE', amount: 22, currency: 'USD', daysAgo: 20 },
  // --- previous months (for the year view + pagination) ---
  { category: 'Salary', type: 'INCOME', amount: 3500, currency: 'USD', daysAgo: 33, note: 'Monthly paycheck' },
  { category: 'Rent', type: 'EXPENSE', amount: 1200, currency: 'USD', daysAgo: 34 },
  { category: 'Market', type: 'EXPENSE', amount: 210, currency: 'USD', daysAgo: 38 },
  { category: 'Utilities', type: 'EXPENSE', amount: 135, currency: 'USD', daysAgo: 40 },
  { category: 'Health', type: 'EXPENSE', amount: 90, currency: 'GBP', daysAgo: 45 },
  { category: 'Entertainment', type: 'EXPENSE', amount: 60, currency: 'EUR', daysAgo: 50 },
  { category: 'Salary', type: 'INCOME', amount: 3500, currency: 'USD', daysAgo: 63, note: 'Monthly paycheck' },
  { category: 'Rent', type: 'EXPENSE', amount: 1200, currency: 'USD', daysAgo: 64 },
  { category: 'Market', type: 'EXPENSE', amount: 195.75, currency: 'USD', daysAgo: 70 },
  { category: 'Transport', type: 'EXPENSE', amount: 48, currency: 'USD', daysAgo: 78 },
  { category: 'Other Income', type: 'INCOME', amount: 250, currency: 'USD', daysAgo: 85, note: 'Gift' },
  { category: 'Health', type: 'EXPENSE', amount: 120, currency: 'USD', daysAgo: 95 },
  { category: 'Utilities', type: 'EXPENSE', amount: 128.4, currency: 'USD', daysAgo: 110 },
  { category: 'Salary', type: 'INCOME', amount: 3400, currency: 'USD', daysAgo: 125, note: 'Monthly paycheck' },
]

type SeedRule = {
  category: string
  type: TransactionType
  amount: number
  currency: string
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  nextRunDate: Date
  note?: string
}

const RECURRING: SeedRule[] = [
  { category: 'Salary', type: 'INCOME', amount: 3500, currency: 'USD', frequency: 'MONTHLY', nextRunDate: daysFromNow(5), note: 'Monthly paycheck' },
  { category: 'Rent', type: 'EXPENSE', amount: 1200, currency: 'USD', frequency: 'MONTHLY', nextRunDate: daysFromNow(8), note: 'Apartment' },
  { category: 'Market', type: 'EXPENSE', amount: 60, currency: 'EUR', frequency: 'WEEKLY', nextRunDate: daysFromNow(2), note: 'Weekly groceries' },
]

async function wipeDemoUser(db: DbClient): Promise<void> {
  const user = await db.user.findUnique({ where: { email: DEMO.email } })
  if (!user) return
  // Delete in dependency order (Transaction.category is onDelete: Restrict, so
  // transactions must go before categories; Transaction.recurring is SetNull).
  await db.transaction.deleteMany({ where: { userId: user.id } })
  await db.recurringTransaction.deleteMany({ where: { userId: user.id } })
  await db.category.deleteMany({ where: { userId: user.id } })
  await db.session.deleteMany({ where: { userId: user.id } })
  await db.account.deleteMany({ where: { userId: user.id } })
  await db.user.delete({ where: { id: user.id } })
  console.log(`Wiped existing demo user (${DEMO.email}) and its data.`)
}

async function main() {
  // Dynamic import so `config()` above has already loaded .env.local before
  // these modules construct their DB connection at load time.
  const { db } = await import('@/lib/db')
  const { auth } = await import('@/lib/auth')

  console.log('Seeding demo data…')

  await wipeDemoUser(db)

  // Sign up through Better Auth so the password is hashed correctly and the
  // signup hook seeds the 9 default categories.
  await auth.api.signUpEmail({
    body: { name: DEMO.name, email: DEMO.email, password: DEMO.password },
  })
  const user = await db.user.findUniqueOrThrow({ where: { email: DEMO.email } })
  console.log(`Created demo user ${DEMO.email} (id ${user.id}).`)

  const categories = await db.category.findMany({ where: { userId: user.id } })
  const byName = new Map(categories.map((c) => [c.name, c]))
  console.log(`  ${categories.length} default categories seeded.`)

  // exchangeRate is a global table (not per-user); upsert so re-runs stay clean.
  for (const [targetCurrency, rate] of Object.entries(EXCHANGE_RATES)) {
    await db.exchangeRate.upsert({
      where: { targetCurrency },
      create: { targetCurrency, rate },
      update: { rate },
    })
  }
  console.log(`  ${Object.keys(EXCHANGE_RATES).length} exchange rates upserted.`)

  for (const tx of TRANSACTIONS) {
    const category = byName.get(tx.category)
    if (!category) throw new Error(`Seed transaction references unknown category "${tx.category}"`)
    await db.transaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        date: daysAgo(tx.daysAgo),
        note: tx.note,
      },
    })
  }
  console.log(`  ${TRANSACTIONS.length} transactions created.`)

  for (const rule of RECURRING) {
    const category = byName.get(rule.category)
    if (!category) throw new Error(`Seed recurring rule references unknown category "${rule.category}"`)
    await db.recurringTransaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        frequency: rule.frequency,
        nextRunDate: rule.nextRunDate,
        note: rule.note,
        active: true,
      },
    })
  }
  console.log(`  ${RECURRING.length} recurring rules created.`)

  console.log(`\nDone. Sign in at /es/sign-in with ${DEMO.email} / ${DEMO.password}`)

  await db.$disconnect()
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
