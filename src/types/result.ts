/**
 * Error codes returned by the MCP server.
 */
export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'AUTH_EXPIRED'
  | 'TOKEN_EXPIRED'
  | 'NO_ACTIVE_ACCOUNT'
  | 'ACCOUNT_NOT_FOUND'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN_ERROR'

/**
 * Error object returned when an operation fails.
 */
export interface EenError {
  code: ErrorCode
  message: string
  status?: number
  details?: unknown
}

/**
 * Result type for all operations - functions never throw exceptions.
 */
export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: EenError }

/**
 * Helper to create a success result.
 */
export function success<T>(data: T): Result<T> {
  return { data, error: null }
}

/**
 * Helper to create an error result.
 */
export function failure<T>(code: ErrorCode, message: string, status?: number, details?: unknown): Result<T> {
  return { data: null, error: { code, message, status, details } }
}

/**
 * Paginated response from list operations.
 */
export interface PaginatedResult<T> {
  results: T[]
  nextPageToken?: string
  prevPageToken?: string
  totalSize?: number
}
