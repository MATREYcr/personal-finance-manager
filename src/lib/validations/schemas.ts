import { TransactionType, RecurrenceFrequency } from '@prisma/client'
import { z } from 'zod'

export const transactionTypeSchema = z.enum(TransactionType)
export const recurrenceFrequencySchema = z.enum(RecurrenceFrequency)
