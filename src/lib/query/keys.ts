export const queryKeys = {
  categories: {
    all: ['categories'] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters: Record<string, string | undefined>, page: number) =>
      ['transactions', filters, page] as const,
  },
  recurringTransactions: {
    all: ['recurring-transactions'] as const,
  },
}
