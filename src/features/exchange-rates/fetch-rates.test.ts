import { describe, it, expect, vi } from 'vitest'
import { refreshExchangeRates } from './fetch-rates'

describe('refreshExchangeRates', () => {
  it('upserts one ExchangeRate row per currency returned by the API', async () => {
    const mockDb = { exchangeRate: { upsert: vi.fn() } } as any
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        base_code: 'USD',
        rates: { USD: 1, EUR: 0.9, GBP: 0.75 },
      }),
    })

    const result = await refreshExchangeRates(mockDb, mockFetch as unknown as typeof fetch)

    expect(result).toEqual({ updated: 2 }) // USD (the pivot) is skipped
    expect(mockDb.exchangeRate.upsert).toHaveBeenCalledWith({
      where: { targetCurrency: 'EUR' },
      create: { targetCurrency: 'EUR', rate: 0.9 },
      update: { rate: 0.9 },
    })
    expect(mockDb.exchangeRate.upsert).toHaveBeenCalledWith({
      where: { targetCurrency: 'GBP' },
      create: { targetCurrency: 'GBP', rate: 0.75 },
      update: { rate: 0.75 },
    })
  })

  it('does not throw and updates nothing when the API call fails', async () => {
    const mockDb = { exchangeRate: { upsert: vi.fn() } } as any
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })

    const result = await refreshExchangeRates(mockDb, mockFetch as unknown as typeof fetch)

    expect(result).toEqual({ updated: 0, error: expect.any(String) })
    expect(mockDb.exchangeRate.upsert).not.toHaveBeenCalled()
  })
})
