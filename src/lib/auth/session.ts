import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    // Defensive backstop only — middleware already redirects unauthenticated
    // requests away from every route that calls this, so this message is
    // never actually shown to a user and is intentionally not translated.
    throw new Error('Not authenticated')
  }
  return session
}
