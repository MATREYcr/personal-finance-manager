'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { createCategory, updateCategory, deleteCategory } from '../actions'

export function useCategoryMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.categories.all })

  const create = useMutation({ mutationFn: createCategory, onSuccess: invalidate })
  const update = useMutation({ mutationFn: updateCategory, onSuccess: invalidate })
  const remove = useMutation({ mutationFn: deleteCategory, onSuccess: invalidate })

  return { create, update, remove }
}
