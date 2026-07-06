import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getRecurringTransactions } from '@/features/recurring-transactions/queries'

export async function GET() {
  const session = await requireSession()
  const rules = await getRecurringTransactions(session.user.id)
  return NextResponse.json(rules)
}
