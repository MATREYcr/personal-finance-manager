import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted above top-level const declarations, so the
// mock objects they reference must be created via vi.hoisted() to avoid a
// "Cannot access before initialization" error.
const { mockRequireSession, mockDb } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockDb: { user: { update: vi.fn() } },
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: () => mockRequireSession() }))
vi.mock('@/lib/db', () => ({ db: mockDb }))

import { updateBaseCurrency } from './actions'

describe('updateBaseCurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('rejects non-3-letter currency codes', async () => {
    await expect(updateBaseCurrency('US')).rejects.toThrow()
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it('updates the current user baseCurrency', async () => {
    await updateBaseCurrency('eur')

    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { baseCurrency: 'EUR' },
    })
  })
})
