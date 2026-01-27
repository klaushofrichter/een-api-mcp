/**
 * Bridge API functions
 */

import { eenFetch } from './client.js'
import type { Result, PaginatedResult, Bridge, ListBridgesParams, GetBridgeParams } from '../types/index.js'
import { failure } from '../types/index.js'

/**
 * List bridges with optional pagination and filtering.
 */
export async function getBridges(params?: ListBridgesParams): Promise<Result<PaginatedResult<Bridge>>> {
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
  if (params?.sort && params.sort.length > 0) {
    queryParams.append('sort', params.sort.join(','))
  }
  if (params?.locationId__in && params.locationId__in.length > 0) {
    queryParams.append('locationId__in', params.locationId__in.join(','))
  }
  if (params?.tags__contains && params.tags__contains.length > 0) {
    queryParams.append('tags__contains', params.tags__contains.join(','))
  }
  if (params?.name) {
    queryParams.append('name', params.name)
  }
  if (params?.name__contains) {
    queryParams.append('name__contains', params.name__contains)
  }
  if (params?.id__in && params.id__in.length > 0) {
    queryParams.append('id__in', params.id__in.join(','))
  }
  if (params?.status__in && params.status__in.length > 0) {
    queryParams.append('status__in', params.status__in.join(','))
  }
  if (params?.status__ne) {
    queryParams.append('status__ne', params.status__ne)
  }
  if (params?.q) {
    queryParams.append('q', params.q)
  }

  const queryString = queryParams.toString()
  const endpoint = `/bridges${queryString ? `?${queryString}` : ''}`

  return eenFetch<PaginatedResult<Bridge>>(endpoint)
}

/**
 * Get a single bridge by ID.
 */
export async function getBridge(bridgeId: string, params?: GetBridgeParams): Promise<Result<Bridge>> {
  if (!bridgeId) {
    return failure('VALIDATION_ERROR', 'Bridge ID is required')
  }

  const queryParams = new URLSearchParams()

  if (params?.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }

  const queryString = queryParams.toString()
  const endpoint = `/bridges/${encodeURIComponent(bridgeId)}${queryString ? `?${queryString}` : ''}`

  return eenFetch<Bridge>(endpoint)
}
