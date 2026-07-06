'use client'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { useSession } from '@/lib/auth/client'
import type { Category } from '../types'

export function useCategories() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async (): Promise<Category[]> => {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed to load categories')
      return res.json()
    },
    enabled: !!session,
  })
}
