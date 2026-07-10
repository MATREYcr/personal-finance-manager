import { describe, it, expect, vi } from 'vitest'
import { seedDefaultCategories } from './seed'
import { DEFAULT_CATEGORIES } from './default-categories'

describe('seedDefaultCategories', () => {
  it('creates one category per default entry, scoped to the given user', async () => {
    const createMany = vi
      .fn()
      .mockResolvedValue({ count: DEFAULT_CATEGORIES.length })
    const mockDb = { category: { createMany } } as any

    await seedDefaultCategories(mockDb, 'user-1')

    expect(createMany).toHaveBeenCalledWith({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: 'user-1' })),
    })
  })
})
