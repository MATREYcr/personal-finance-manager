import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted above top-level const declarations, so the
// mock objects they reference must be created via vi.hoisted() to avoid a
// "Cannot access before initialization" error.
const { mockRequireSession, mockGetTranslations, mockDb } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockGetTranslations: vi.fn(),
  mockDb: {
    category: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    transaction: { count: vi.fn() },
    recurringTransaction: { count: vi.fn() },
  },
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))
vi.mock('next-intl/server', () => ({ getTranslations: () => mockGetTranslations() }))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

import { deleteCategory } from './actions'

describe('deleteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockGetTranslations.mockResolvedValue((key: string) => key)
  })

  it('returns blocked and does not delete when transactions still reference the category', async () => {
    mockDb.transaction.count.mockResolvedValue(2)
    mockDb.recurringTransaction.count.mockResolvedValue(0)

    await expect(deleteCategory('cat-1')).resolves.toEqual({ blocked: true, message: 'deleteError' })
    expect(mockDb.category.delete).not.toHaveBeenCalled()
  })

  it('returns blocked and does not delete when recurring transactions still reference the category', async () => {
    mockDb.transaction.count.mockResolvedValue(0)
    mockDb.recurringTransaction.count.mockResolvedValue(1)

    await expect(deleteCategory('cat-1')).resolves.toEqual({ blocked: true, message: 'deleteError' })
    expect(mockDb.category.delete).not.toHaveBeenCalled()
  })

  it('deletes the category when nothing references it', async () => {
    mockDb.transaction.count.mockResolvedValue(0)
    mockDb.recurringTransaction.count.mockResolvedValue(0)

    await expect(deleteCategory('cat-1')).resolves.toEqual({ blocked: false })

    expect(mockDb.category.delete).toHaveBeenCalledWith({
      where: { id: 'cat-1', userId: 'user-1' },
    })
  })
})
