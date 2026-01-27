/**
 * Camera API functions
 */

import { eenFetch } from './client.js'
import type { Result, PaginatedResult, Camera, ListCamerasParams, GetCameraParams } from '../types/index.js'
import { failure } from '../types/index.js'

/**
 * List cameras with optional pagination and filtering.
 */
export async function getCameras(params?: ListCamerasParams): Promise<Result<PaginatedResult<Camera>>> {
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
  if (params?.bridgeId__in && params.bridgeId__in.length > 0) {
    queryParams.append('bridgeId__in', params.bridgeId__in.join(','))
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
  const endpoint = `/cameras${queryString ? `?${queryString}` : ''}`

  return eenFetch<PaginatedResult<Camera>>(endpoint)
}

/**
 * Get a single camera by ID.
 */
export async function getCamera(cameraId: string, params?: GetCameraParams): Promise<Result<Camera>> {
  if (!cameraId) {
    return failure('VALIDATION_ERROR', 'Camera ID is required')
  }

  const queryParams = new URLSearchParams()

  if (params?.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }

  const queryString = queryParams.toString()
  const endpoint = `/cameras/${encodeURIComponent(cameraId)}${queryString ? `?${queryString}` : ''}`

  return eenFetch<Camera>(endpoint)
}
