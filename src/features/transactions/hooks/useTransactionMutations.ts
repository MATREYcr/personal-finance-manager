'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../actions'

export function useTransactionMutations() {
  const qc = useQueryClient()
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: queryKeys.transactions.all })

  return {
    create: useMutation({
      mutationFn: createTransaction,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: updateTransaction,
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: deleteTransaction,
      onSuccess: invalidate,
    }),
  }
}
