/**
 * User API functions
 */

import { eenFetch } from './client.js'
import type { Result, PaginatedResult, User, ListUsersParams, GetUserParams } from '../types/index.js'
import { failure } from '../types/index.js'

/**
 * Get the current authenticated user.
 */
export async function getCurrentUser(): Promise<Result<User>> {
  return eenFetch<User>('/users/self')
}

/**
 * List users with optional pagination.
 */
export async function getUsers(params?: ListUsersParams): Promise<Result<PaginatedResult<User>>> {
  const queryParams = new URLSearchParams()

  if (params?.pageSize) {
    queryParams.append('pageSize', String(params.pageSize))
  }
  if (params?.pageToken) {
    queryParams.append('pageToken', params.pageToken)
  }
  if (params?.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }

  const queryString = queryParams.toString()
  const endpoint = `/users${queryString ? `?${queryString}` : ''}`

  return eenFetch<PaginatedResult<User>>(endpoint)
}

/**
 * Get a single user by ID.
 */
export async function getUser(userId: string, params?: GetUserParams): Promise<Result<User>> {
  if (!userId) {
    return failure('VALIDATION_ERROR', 'User ID is required')
  }

  const queryParams = new URLSearchParams()

  if (params?.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }

  const queryString = queryParams.toString()
  const endpoint = `/users/${encodeURIComponent(userId)}${queryString ? `?${queryString}` : ''}`

  return eenFetch<User>(endpoint)
}
