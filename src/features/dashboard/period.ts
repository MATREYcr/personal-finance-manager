import type { Period } from './types'

export function getPeriodRange(period: Period, reference: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(reference)
  const end = new Date(reference)

  if (period === 'week') {
    const day = start.getUTCDay()
    const diffToMonday = (day + 6) % 7
    start.setUTCDate(start.getUTCDate() - diffToMonday)
    start.setUTCHours(0, 0, 0, 0)
    end.setTime(start.getTime())
    end.setUTCDate(end.getUTCDate() + 7)
  } else if (period === 'month') {
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    end.setTime(start.getTime())
    end.setUTCMonth(end.getUTCMonth() + 1)
  } else {
    start.setUTCMonth(0, 1)
    start.setUTCHours(0, 0, 0, 0)
    end.setTime(start.getTime())
    end.setUTCFullYear(end.getUTCFullYear() + 1)
  }

  return { start, end }
}
