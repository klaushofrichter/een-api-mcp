/**
 * Layout API functions
 */

import { eenFetch } from './client.js'
import type {
  Result,
  PaginatedResult,
  Layout,
  ListLayoutsParams,
  GetLayoutParams
} from '../types/index.js'

/**
 * List layouts with optional filtering and pagination.
 */
export async function getLayouts(params?: ListLayoutsParams): Promise<Result<PaginatedResult<Layout>>> {
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
  if (params?.name) {
    queryParams.append('name', params.name)
  }
  if (params?.name__in && params.name__in.length > 0) {
    queryParams.append('name__in', params.name__in.join(','))
  }
  if (params?.name__contains) {
    queryParams.append('name__contains', params.name__contains)
  }
  if (params?.id__in && params.id__in.length > 0) {
    queryParams.append('id__in', params.id__in.join(','))
  }
  if (params?.q) {
    queryParams.append('q', params.q)
  }
  if (typeof params?.qRelevance__gte === 'number') {
    queryParams.append('qRelevance__gte', String(params.qRelevance__gte))
  }

  const queryString = queryParams.toString()
  const endpoint = `/layouts${queryString ? `?${queryString}` : ''}`

  return eenFetch<PaginatedResult<Layout>>(endpoint)
}

/**
 * Get a specific layout by ID.
 */
export async function getLayout(layoutId: string, params?: GetLayoutParams): Promise<Result<Layout>> {
  const queryParams = new URLSearchParams()

  if (params?.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }

  const queryString = queryParams.toString()
  const endpoint = `/layouts/${layoutId}${queryString ? `?${queryString}` : ''}`

  return eenFetch<Layout>(endpoint)
}
