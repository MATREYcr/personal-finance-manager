import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getTransactions } from '@/features/transactions/queries'
import type { TransactionFilters } from '@/features/transactions/types'
import type { TransactionType } from '@prisma/client'

export async function GET(request: Request) {
  const session = await requireSession()
  const { searchParams } = new URL(request.url)
  const filters: TransactionFilters = {
    categoryId: searchParams.get('categoryId') ?? undefined,
    type: (searchParams.get('type') as TransactionType | null) ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  }
  const page = Number(searchParams.get('page') ?? '1') || 1
  const result = await getTransactions(session.user.id, filters, page)
  return NextResponse.json(result)
}
