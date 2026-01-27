/**
 * Media API functions
 */

import { eenFetch, eenFetchBinary, arrayBufferToBase64DataUrl } from './client.js'
import { formatTimestamp } from './utils.js'
import type {
  Result,
  PaginatedResult,
  MediaInterval,
  ListMediaParams,
  GetLiveImageParams,
  GetRecordedImageParams,
  LiveImageResult,
  RecordedImageResult
} from '../types/index.js'
import { success, failure } from '../types/index.js'

/**
 * List media intervals (recording periods) for a device.
 */
export async function listMedia(params: ListMediaParams): Promise<Result<PaginatedResult<MediaInterval>>> {
  // Validate required parameters
  if (!params.deviceId) {
    return failure('VALIDATION_ERROR', 'Device ID is required')
  }
  if (!params.type) {
    return failure('VALIDATION_ERROR', 'Stream type is required (preview or main)')
  }
  if (!params.mediaType) {
    return failure('VALIDATION_ERROR', 'Media type is required (video or image)')
  }
  if (!params.startTimestamp) {
    return failure('VALIDATION_ERROR', 'Start timestamp is required')
  }

  const queryParams = new URLSearchParams()

  // Required parameters - use formatTimestamp for EEN API compatibility
  queryParams.append('deviceId', params.deviceId)
  queryParams.append('type', params.type)
  queryParams.append('mediaType', params.mediaType)
  queryParams.append('startTimestamp__gte', formatTimestamp(params.startTimestamp))

  // Optional parameters
  if (params.endTimestamp) {
    queryParams.append('endTimestamp__lte', formatTimestamp(params.endTimestamp))
  }
  if (typeof params.coalesce === 'boolean') {
    queryParams.append('coalesce', String(params.coalesce))
  }
  if (params.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }
  if (params.pageToken) {
    queryParams.append('pageToken', params.pageToken)
  }
  if (typeof params.pageSize === 'number') {
    queryParams.append('pageSize', String(params.pageSize))
  }

  const queryString = queryParams.toString()
  const endpoint = `/media?${queryString}`

  return eenFetch<PaginatedResult<MediaInterval>>(endpoint)
}

/**
 * Get a live image from a camera.
 */
export async function getLiveImage(params: GetLiveImageParams): Promise<Result<LiveImageResult>> {
  if (!params.deviceId) {
    return failure('VALIDATION_ERROR', 'Device ID is required')
  }

  const type = params.type ?? 'preview'

  const queryParams = new URLSearchParams()
  queryParams.append('deviceId', params.deviceId)
  queryParams.append('type', type)

  const endpoint = `/media/liveImage.jpeg?${queryParams.toString()}`

  const result = await eenFetchBinary(endpoint)

  if (result.error) {
    return failure(result.error.code, result.error.message, result.error.status)
  }

  const { data, headers } = result.data
  const imageData = arrayBufferToBase64DataUrl(data)
  const timestamp = headers.get('X-Een-Timestamp')
  const prevToken = headers.get('X-Een-PrevToken')

  return success({
    imageData,
    timestamp,
    prevToken
  })
}

/**
 * Get a recorded image from a camera.
 */
export async function getRecordedImage(params: GetRecordedImageParams): Promise<Result<RecordedImageResult>> {
  // Validate: either deviceId or pageToken is required
  if (!params.deviceId && !params.pageToken) {
    return failure('VALIDATION_ERROR', 'Either deviceId or pageToken is required')
  }

  // If not using pageToken, validate at least one timestamp parameter
  if (!params.pageToken) {
    const hasTimestamp = params.timestamp__lt || params.timestamp__lte ||
                         params.timestamp || params.timestamp__gte || params.timestamp__gt
    if (!hasTimestamp) {
      return failure('VALIDATION_ERROR', 'At least one timestamp parameter is required')
    }
  }

  const queryParams = new URLSearchParams()

  if (params.deviceId) {
    queryParams.append('deviceId', params.deviceId)
  }
  if (params.pageToken) {
    queryParams.append('pageToken', params.pageToken)
  }
  if (params.type) {
    queryParams.append('type', params.type)
  }

  // Timestamp parameters - use formatTimestamp for EEN API compatibility
  if (params.timestamp__lt) {
    queryParams.append('timestamp__lt', formatTimestamp(params.timestamp__lt))
  }
  if (params.timestamp__lte) {
    queryParams.append('timestamp__lte', formatTimestamp(params.timestamp__lte))
  }
  if (params.timestamp) {
    queryParams.append('timestamp', formatTimestamp(params.timestamp))
  }
  if (params.timestamp__gte) {
    queryParams.append('timestamp__gte', formatTimestamp(params.timestamp__gte))
  }
  if (params.timestamp__gt) {
    queryParams.append('timestamp__gt', formatTimestamp(params.timestamp__gt))
  }

  // Overlay parameters
  if (params.overlayId__in && params.overlayId__in.length > 0) {
    queryParams.append('overlayId__in', params.overlayId__in.join(','))
  }
  if (params.include && params.include.length > 0) {
    queryParams.append('include', params.include.join(','))
  }

  // Size parameters
  if (typeof params.targetWidth === 'number') {
    queryParams.append('targetWidth', String(params.targetWidth))
  }
  if (typeof params.targetHeight === 'number') {
    queryParams.append('targetHeight', String(params.targetHeight))
  }

  const endpoint = `/media/recordedImage.jpeg?${queryParams.toString()}`

  const result = await eenFetchBinary(endpoint)

  if (result.error) {
    return failure(result.error.code, result.error.message, result.error.status)
  }

  const { data, headers } = result.data
  const imageData = arrayBufferToBase64DataUrl(data)
  const timestamp = headers.get('X-Een-Timestamp')
  const nextToken = headers.get('X-Een-NextToken')
  const prevToken = headers.get('X-Een-PrevToken')
  const overlaySvg = headers.get('X-Een-OverlaySvg')

  return success({
    imageData,
    timestamp,
    nextToken,
    prevToken,
    overlaySvg
  })
}
