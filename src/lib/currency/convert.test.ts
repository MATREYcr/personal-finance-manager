import { describe, it, expect } from 'vitest'
import { convertAmount } from './convert'

describe('convertAmount', () => {
  const rates = { EUR: 0.9, GBP: 0.75 } // relative to USD pivot

  it('returns the same amount when currencies match', () => {
    expect(convertAmount(100, 'USD', 'USD', rates)).toBe(100)
  })

  it('converts from the pivot currency to another', () => {
    expect(convertAmount(100, 'USD', 'EUR', rates)).toBeCloseTo(90)
  })

  it('converts from another currency to the pivot', () => {
    expect(convertAmount(90, 'EUR', 'USD', rates)).toBeCloseTo(100)
  })

  it('converts across two non-pivot currencies', () => {
    expect(convertAmount(90, 'EUR', 'GBP', rates)).toBeCloseTo(75)
  })

  it('throws when a required rate is missing', () => {
    expect(() => convertAmount(100, 'JPY', 'USD', rates)).toThrow(/JPY/)
  })
})
