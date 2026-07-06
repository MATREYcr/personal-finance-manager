import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getCategories } from '@/features/categories/queries'

export async function GET() {
  const session = await requireSession()
  const categories = await getCategories(session.user.id)
  return NextResponse.json(categories)
}
