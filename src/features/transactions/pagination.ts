export const TRANSACTIONS_PAGE_SIZE = 20

export function getPaginationParams(
  page: number,
  pageSize: number = TRANSACTIONS_PAGE_SIZE,
) {
  return { skip: (page - 1) * pageSize, take: pageSize }
}

export function getTotalPages(
  totalCount: number,
  pageSize: number = TRANSACTIONS_PAGE_SIZE,
) {
  return Math.max(1, Math.ceil(totalCount / pageSize))
}
