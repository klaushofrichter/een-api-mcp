/**
 * Base HTTP client for EEN API
 */

import { requireActiveAccount, ensureValidToken, getAccount } from '../auth/token-manager.js'
import { success, failure, type Result } from '../types/index.js'

const DEFAULT_TIMEOUT_MS = 30000
const MEDIA_TIMEOUT_MS = 60000

/**
 * Options for API requests.
 */
export interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  timeout?: number
}

/**
 * Create an AbortController with a timeout.
 */
function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { controller, timeoutId }
}

/**
 * Handle error responses from the API.
 */
async function handleErrorResponse<T>(response: Response): Promise<Result<T>> {
  const status = response.status

  let message: string
  try {
    const errorData = await response.json() as { message?: string; error?: string }
    message = errorData.message ?? errorData.error ?? response.statusText
  } catch {
    message = response.statusText || 'Unknown error'
  }

  switch (status) {
    case 401:
      return failure('AUTH_REQUIRED', `Authentication failed: ${message}`, status)
    case 403:
      return failure('FORBIDDEN', `Access denied: ${message}`, status)
    case 404:
      return failure('NOT_FOUND', `Not found: ${message}`, status)
    case 429:
      return failure('RATE_LIMITED', `Rate limited: ${message}`, status)
    case 503:
      return failure('SERVICE_UNAVAILABLE', `Service unavailable: ${message}`, status)
    default:
      return failure('API_ERROR', `API error: ${message}`, status)
  }
}

/**
 * Make an authenticated API request.
 */
export async function eenFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Result<T>> {
  // Get active account
  const accountResult = requireActiveAccount()
  if (accountResult.error) {
    return failure(accountResult.error.code, accountResult.error.message)
  }

  const { accountId } = accountResult.data

  // Ensure token is valid
  const tokenResult = await ensureValidToken(accountId)
  if (tokenResult.error) {
    return failure(tokenResult.error.code, tokenResult.error.message)
  }

  // Get refreshed account (token may have been updated)
  const refreshedAccount = getAccount(accountId)
  if (!refreshedAccount) {
    return failure('ACCOUNT_NOT_FOUND', 'Account not found after token refresh')
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS
  const { controller, timeoutId } = createTimeoutController(timeout)

  const url = `${refreshedAccount.baseUrl}/api/v3.0${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${refreshedAccount.accessToken}`,
        ...options.headers
      },
      signal: controller.signal
    })

    if (!response.ok) {
      return handleErrorResponse(response)
    }

    const data = await response.json() as T
    return success(data)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return failure('NETWORK_ERROR', 'Request timed out')
    }
    return failure('NETWORK_ERROR', `Request failed: ${String(err)}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Make an authenticated API request that returns binary data (for images).
 */
export async function eenFetchBinary(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Result<{ data: ArrayBuffer; headers: Headers }>> {
  // Get active account
  const accountResult = requireActiveAccount()
  if (accountResult.error) {
    return failure(accountResult.error.code, accountResult.error.message)
  }

  const { accountId } = accountResult.data

  // Ensure token is valid
  const tokenResult = await ensureValidToken(accountId)
  if (tokenResult.error) {
    return failure(tokenResult.error.code, tokenResult.error.message)
  }

  // Get refreshed account
  const refreshedAccount = getAccount(accountId)
  if (!refreshedAccount) {
    return failure('ACCOUNT_NOT_FOUND', 'Account not found after token refresh')
  }

  const timeout = options.timeout ?? MEDIA_TIMEOUT_MS
  const { controller, timeoutId } = createTimeoutController(timeout)

  const url = `${refreshedAccount.baseUrl}/api/v3.0${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'image/jpeg',
        'Authorization': `Bearer ${refreshedAccount.accessToken}`,
        ...options.headers
      },
      signal: controller.signal
    })

    if (!response.ok) {
      return handleErrorResponse(response)
    }

    const data = await response.arrayBuffer()
    return success({ data, headers: response.headers })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return failure('NETWORK_ERROR', 'Request timed out')
    }
    return failure('NETWORK_ERROR', `Request failed: ${String(err)}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Convert ArrayBuffer to base64 data URL.
 */
export function arrayBufferToBase64DataUrl(buffer: ArrayBuffer, mimeType: string = 'image/jpeg'): string {
  const bytes = new Uint8Array(buffer)
  // Use chunked approach for O(n) complexity
  const chunkSize = 8192
  const chunks: string[] = []

  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength))
    let str = ''
    for (let j = 0; j < chunk.length; j++) {
      str += String.fromCharCode(chunk[j]!)
    }
    chunks.push(str)
  }

  const binary = chunks.join('')
  const base64 = Buffer.from(binary, 'binary').toString('base64')
  return `data:${mimeType};base64,${base64}`
}
