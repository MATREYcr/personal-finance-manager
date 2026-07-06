'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { createCategory, updateCategory, deleteCategory } from '../actions'

export function useCategoryMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.categories.all })

  const create = useMutation({ mutationFn: createCategory, onSuccess: invalidate })
  const update = useMutation({ mutationFn: updateCategory, onSuccess: invalidate })
  const remove = useMutation({
    mutationFn: async (categoryId: string) => {
      // deleteCategory returns (rather than throws) on the expected
      // "still referenced" case, since Next.js redacts thrown Server Action
      // errors in production. Re-throw here, client-side, so this mutation's
      // isError/error.message keep working exactly as a throwing action would.
      const result = await deleteCategory(categoryId)
      if (result.blocked) throw new Error(result.message)
    },
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
