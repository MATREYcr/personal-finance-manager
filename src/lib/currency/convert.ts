export const PIVOT_CURRENCY = 'USD'

export type RateMap = Record<string, number>

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: RateMap,
): number {
  if (from === to) return amount

  const rateFrom = from === PIVOT_CURRENCY ? 1 : rates[from]
  const rateTo = to === PIVOT_CURRENCY ? 1 : rates[to]

  if (rateFrom === undefined)
    throw new Error(`Missing exchange rate for currency: ${from}`)
  if (rateTo === undefined)
    throw new Error(`Missing exchange rate for currency: ${to}`)

  const amountInPivot = amount / rateFrom
  return amountInPivot * rateTo
}
