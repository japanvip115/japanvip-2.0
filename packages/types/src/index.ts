// Re-export shared types used across the monorepo

export type PaginationParams = {
  page?: number
  limit?: number
}

export type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type ApiSuccessResponse<T> = {
  success: true
  data: T
  message?: string
}

export type ApiErrorResponse = {
  success: false
  error: string
  details?: unknown
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// Auction event types for SSE
export type AuctionEvent =
  | { type: 'bid_placed'; data: { bidderId: string; amount: number; newCurrentPrice: number; bidCount: number; newEndTime?: string } }
  | { type: 'auction_ended'; data: { winnerId: string | null; winnerAmount: number | null } }
  | { type: 'auction_extended'; data: { newEndTime: string } }
  | { type: 'countdown_sync'; data: { serverTime: string; endsAt: string } }
