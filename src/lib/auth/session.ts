import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    // Defensive backstop only; middleware already redirects unauthenticated requests, so this is never user-facing.
    throw new Error('Not authenticated')
  }
  return session
}
