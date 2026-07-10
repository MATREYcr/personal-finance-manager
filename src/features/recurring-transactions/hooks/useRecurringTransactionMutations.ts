'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  setRecurringTransactionActive,
  deleteRecurringTransaction,
} from '../actions'

export function useRecurringTransactionMutations() {
  const qc = useQueryClient()
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: queryKeys.recurringTransactions.all })

  return {
    create: useMutation({
      mutationFn: createRecurringTransaction,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: updateRecurringTransaction,
      onSuccess: invalidate,
    }),
    toggleActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        setRecurringTransactionActive(id, active),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: deleteRecurringTransaction,
      onSuccess: invalidate,
    }),
  }
}
