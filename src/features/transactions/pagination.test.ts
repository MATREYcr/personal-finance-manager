import { describe, it, expect } from 'vitest'
import { getPaginationParams, getTotalPages, TRANSACTIONS_PAGE_SIZE } from './pagination'

describe('getPaginationParams', () => {
  it('computes skip/take for the first page', () => {
    expect(getPaginationParams(1, 20)).toEqual({ skip: 0, take: 20 })
  })

  it('computes skip/take for a later page', () => {
    expect(getPaginationParams(3, 20)).toEqual({ skip: 40, take: 20 })
  })

  it('defaults to TRANSACTIONS_PAGE_SIZE when no pageSize is given', () => {
    expect(getPaginationParams(1)).toEqual({ skip: 0, take: TRANSACTIONS_PAGE_SIZE })
  })
})

describe('getTotalPages', () => {
  it('rounds up a partial final page', () => {
    expect(getTotalPages(45, 20)).toBe(3)
  })

  it('returns exactly the page count when evenly divisible', () => {
    expect(getTotalPages(40, 20)).toBe(2)
  })

  it('returns at least 1 page when there are zero results', () => {
    expect(getTotalPages(0, 20)).toBe(1)
  })
})
