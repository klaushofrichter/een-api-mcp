/**
 * Event API functions
 */

import { eenFetch } from './client.js'
import { formatTimestamp } from './utils.js'
import type { Result, PaginatedResult, Event, EventType, ListEventsParams, ListEventTypesParams } from '../types/index.js'
import { failure } from '../types/index.js'

/**
 * List events with required filters.
 */
export async function listEvents(params: ListEventsParams): Promise<Result<PaginatedResult<Event>>> {
  // Validate required parameters
  if (!params.actor) {
    return failure('VALIDATION_ERROR', 'Actor is required (e.g., "camera:100d4c41")')
  }
  if (!params.type__in || params.type__in.length === 0) {
    return failure('VALIDATION_ERROR', 'At least one event type is required')
  }
  if (!params.startTimestamp__gte) {
    return failure('VALIDATION_ERROR', 'Start timestamp is required')
  }

  const queryParams = new URLSearchParams()

  // Required parameters - use formatTimestamp for EEN API compatibility
  queryParams.append('actor', params.actor)
  queryParams.append('type__in', params.type__in.join(','))
  queryParams.append('startTimestamp__gte', formatTimestamp(params.startTimestamp__gte))

  // Optional parameters
  if (params.pageSize) {
    queryParams.append('pageSize', String(params.pageSize))
  }
  if (params.pageToken) {
    queryParams.append('pageToken', params.pageToken)
  }
  if (params.startTimestamp__lte) {
    queryParams.append('startTimestamp__lte', formatTimestamp(params.startTimestamp__lte))
  }
  if (params.endTimestamp__gte) {
    queryParams.append('endTimestamp__gte', formatTimestamp(params.endTimestamp__gte))
  }
  if (params.endTimestamp__lte) {
    queryParams.append('endTimestamp__lte', formatTimestamp(params.endTimestamp__lte))
  }
  if (params.sort) {
    queryParams.append('sort', params.sort)
  }
  if (params.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }

  const queryString = queryParams.toString()
  const endpoint = `/events?${queryString}`

  return eenFetch<PaginatedResult<Event>>(endpoint)
}

/**
 * List available event types.
 */
export async function listEventTypes(params?: ListEventTypesParams): Promise<Result<PaginatedResult<EventType>>> {
  const queryParams = new URLSearchParams()

  if (params?.pageSize) {
    queryParams.append('pageSize', String(params.pageSize))
  }
  if (params?.pageToken) {
    queryParams.append('pageToken', params.pageToken)
  }
  if (params?.language) {
    queryParams.append('language', params.language)
  }

  const queryString = queryParams.toString()
  // Correct endpoint is /eventTypes, not /events:listTypes
  const endpoint = `/eventTypes${queryString ? `?${queryString}` : ''}`

  return eenFetch<PaginatedResult<EventType>>(endpoint)
}
