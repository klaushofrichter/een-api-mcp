/**
 * Alert API functions
 */

import { eenFetch } from './client.js'
import type { Result, PaginatedResult, Alert, ListAlertsParams, GetAlertParams } from '../types/index.js'
import { failure } from '../types/index.js'

/**
 * List alerts with optional filters.
 */
export async function listAlerts(params?: ListAlertsParams): Promise<Result<PaginatedResult<Alert>>> {
  const queryParams = new URLSearchParams()

  // Pagination
  if (params?.pageSize) {
    queryParams.append('pageSize', String(params.pageSize))
  }
  if (params?.pageToken) {
    queryParams.append('pageToken', params.pageToken)
  }

  // Time filters
  if (params?.timestamp__lte) {
    queryParams.append('timestamp__lte', params.timestamp__lte)
  }
  if (params?.timestamp__gte) {
    queryParams.append('timestamp__gte', params.timestamp__gte)
  }

  // Entity filters
  if (params?.creatorId) {
    queryParams.append('creatorId', params.creatorId)
  }
  if (params?.alertType__in && params.alertType__in.length > 0) {
    queryParams.append('alertType__in', params.alertType__in.join(','))
  }
  if (params?.actorId__in && params.actorId__in.length > 0) {
    queryParams.append('actorId__in', params.actorId__in.join(','))
  }
  if (params?.actorType__in && params.actorType__in.length > 0) {
    queryParams.append('actorType__in', params.actorType__in.join(','))
  }
  if (params?.actorAccountId) {
    queryParams.append('actorAccountId', params.actorAccountId)
  }

  // Rule filters
  if (params?.ruleId) {
    queryParams.append('ruleId', params.ruleId)
  }
  if (params?.ruleId__in && params.ruleId__in.length > 0) {
    queryParams.append('ruleId__in', params.ruleId__in.join(','))
  }

  // Event and location filters
  if (params?.eventId) {
    queryParams.append('eventId', params.eventId)
  }
  if (params?.locationId__in && params.locationId__in.length > 0) {
    queryParams.append('locationId__in', params.locationId__in.join(','))
  }

  // Priority filters
  if (typeof params?.priority__gte === 'number') {
    queryParams.append('priority__gte', String(params.priority__gte))
  }
  if (typeof params?.priority__lte === 'number') {
    queryParams.append('priority__lte', String(params.priority__lte))
  }

  // Other filters
  if (typeof params?.showInvalidAlerts === 'boolean') {
    queryParams.append('showInvalidAlerts', String(params.showInvalidAlerts))
  }

  // Response options
  if (params?.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }
  if (params?.sort && params.sort.length > 0) {
    queryParams.append('sort', params.sort.join(','))
  }

  const queryString = queryParams.toString()
  const endpoint = `/alerts${queryString ? `?${queryString}` : ''}`

  return eenFetch<PaginatedResult<Alert>>(endpoint)
}

/**
 * Get a single alert by ID.
 */
export async function getAlert(alertId: string, params?: GetAlertParams): Promise<Result<Alert>> {
  if (!alertId) {
    return failure('VALIDATION_ERROR', 'Alert ID is required')
  }

  const queryParams = new URLSearchParams()

  if (params?.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }

  const queryString = queryParams.toString()
  const endpoint = `/alerts/${encodeURIComponent(alertId)}${queryString ? `?${queryString}` : ''}`

  return eenFetch<Alert>(endpoint)
}
