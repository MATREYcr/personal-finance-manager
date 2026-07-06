import { describe, it, expect } from 'vitest'
import { getPeriodRange } from './period'

describe('getPeriodRange', () => {
  it('returns the Monday-to-Monday week range', () => {
    // 2026-07-04 is a Saturday
    const { start, end } = getPeriodRange('week', new Date('2026-07-04T12:00:00Z'))
    expect(start.toISOString().slice(0, 10)).toBe('2026-06-29') // Monday
    expect(end.toISOString().slice(0, 10)).toBe('2026-07-06') // next Monday
  })

  it('returns the calendar month range', () => {
    const { start, end } = getPeriodRange('month', new Date('2026-07-15T12:00:00Z'))
    expect(start.toISOString().slice(0, 10)).toBe('2026-07-01')
    expect(end.toISOString().slice(0, 10)).toBe('2026-08-01')
  })

  it('returns the calendar year range', () => {
    const { start, end } = getPeriodRange('year', new Date('2026-07-15T12:00:00Z'))
    expect(start.toISOString().slice(0, 10)).toBe('2026-01-01')
    expect(end.toISOString().slice(0, 10)).toBe('2027-01-01')
  })
})
