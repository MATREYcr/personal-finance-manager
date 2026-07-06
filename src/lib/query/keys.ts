export const queryKeys = {
  categories: {
    all: ['categories'] as const,
  },
  // Later plans append their own top-level key here, e.g.:
  // transactions: { all: [...], list: (filters) => [...] },
  // recurringTransactions: { all: [...] },
}
