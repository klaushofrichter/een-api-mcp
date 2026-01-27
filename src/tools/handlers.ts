/**
 * MCP Tool Handlers
 *
 * Maps tool calls to API functions and formats responses.
 */

import type { CallToolResult, TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js'
import {
  loadCredentials,
  listAccounts,
  setActiveAccount,
  getAuthStatus,
  getActiveAccountId
} from '../auth/token-manager.js'
import { getCameras, getCamera } from '../api/cameras.js'
import { getBridges, getBridge } from '../api/bridges.js'
import { getCurrentUser, getUsers, getUser } from '../api/users.js'
import { listEvents, listEventTypes } from '../api/events.js'
import { listAlerts } from '../api/alerts.js'
import { getLiveImage, getRecordedImage, listMedia } from '../api/media.js'
import { getLayouts, getLayout } from '../api/layouts.js'
import type { ListCamerasParams, ListBridgesParams, ListEventsParams, ListAlertsParams, ListMediaParams, ListLayoutsParams, GetLayoutParams } from '../types/index.js'

/**
 * Format a successful result as text content.
 */
function textResult(content: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      } as TextContent
    ]
  }
}

/**
 * Format an error result.
 */
function errorResult(message: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`
      } as TextContent
    ],
    isError: true
  }
}

/**
 * Format an image result with metadata.
 */
function imageResult(imageData: string, metadata: Record<string, unknown>): CallToolResult {
  // Extract base64 data from data URL
  const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/)

  if (!base64Match) {
    return errorResult('Invalid image data format')
  }

  const mimeType = base64Match[1]!
  const base64Data = base64Match[2]!

  return {
    content: [
      {
        type: 'image',
        data: base64Data,
        mimeType
      } as ImageContent,
      {
        type: 'text',
        text: JSON.stringify(metadata, null, 2)
      } as TextContent
    ]
  }
}

/**
 * Handle a tool call and return the result.
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  // Ensure credentials are loaded
  const loadResult = loadCredentials()
  if (loadResult.error && loadResult.error.code !== 'AUTH_REQUIRED') {
    // Only fail if it's not just missing credentials (list/status should still work)
    if (!['een_auth_status', 'een_list_accounts'].includes(toolName)) {
      return errorResult(loadResult.error.message)
    }
  }

  switch (toolName) {
    // =========================================================================
    // Authentication Tools
    // =========================================================================
    case 'een_auth_status': {
      const status = getAuthStatus()
      return textResult({
        activeAccount: status.activeAccount,
        accounts: status.accounts.map(a => ({
          accountId: a.accountId,
          baseUrl: a.baseUrl,
          userName: a.userName,
          tokenValid: a.accessTokenValid,
          tokenExpiresAt: new Date(a.accessTokenExpiresAt).toISOString(),
          hasStoredPassword: a.hasPassword
        }))
      })
    }

    case 'een_list_accounts': {
      const accounts = listAccounts()
      const activeAccount = getActiveAccountId()
      return textResult({
        accounts,
        activeAccount,
        note: accounts.length === 0
          ? 'No accounts configured. Run "npx tsx cli/auth.ts login" to add an account.'
          : 'Use een_set_account to select an account before making API calls.'
      })
    }

    case 'een_set_account': {
      const accountId = args.accountId as string
      if (!accountId) {
        return errorResult('accountId is required')
      }

      const result = setActiveAccount(accountId)
      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        success: true,
        activeAccount: accountId,
        message: `Account '${accountId}' is now active. You can make API calls.`
      })
    }

    // =========================================================================
    // Camera Tools
    // =========================================================================
    case 'een_get_cameras': {
      const params: ListCamerasParams = {
        pageSize: args.pageSize as number | undefined,
        pageToken: args.pageToken as string | undefined,
        include: args.include as string[] | undefined,
        status__in: args.status__in as ListCamerasParams['status__in'],
        name__contains: args.name__contains as string | undefined,
        q: args.q as string | undefined
      }

      const result = await getCameras(params)
      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        cameras: result.data.results.map(c => ({
          id: c.id,
          name: c.name,
          status: typeof c.status === 'string' ? c.status : c.status?.connectionStatus,
          bridgeId: c.bridgeId,
          tags: c.tags
        })),
        totalCount: result.data.results.length,
        nextPageToken: result.data.nextPageToken
      })
    }

    case 'een_get_camera': {
      const cameraId = args.cameraId as string
      if (!cameraId) {
        return errorResult('cameraId is required')
      }

      const result = await getCamera(cameraId, {
        include: args.include as string[] | undefined
      })

      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult(result.data)
    }

    // =========================================================================
    // Media Tools
    // =========================================================================
    case 'een_get_live_image': {
      const deviceId = args.deviceId as string
      if (!deviceId) {
        return errorResult('deviceId is required')
      }

      const result = await getLiveImage({ deviceId })
      if (result.error) {
        return errorResult(result.error.message)
      }

      return imageResult(result.data.imageData, {
        timestamp: result.data.timestamp,
        deviceId
      })
    }

    case 'een_get_recorded_image': {
      const deviceId = args.deviceId as string
      if (!deviceId) {
        return errorResult('deviceId is required')
      }

      // Need at least one timestamp parameter
      if (!args.timestamp && !args.timestamp__gte && !args.timestamp__lte) {
        return errorResult('At least one timestamp parameter is required (timestamp, timestamp__gte, or timestamp__lte)')
      }

      const result = await getRecordedImage({
        deviceId,
        timestamp: args.timestamp as string | undefined,
        timestamp__gte: args.timestamp__gte as string | undefined,
        timestamp__lte: args.timestamp__lte as string | undefined,
        type: args.type as 'preview' | 'main' | undefined
      })

      if (result.error) {
        return errorResult(result.error.message)
      }

      return imageResult(result.data.imageData, {
        timestamp: result.data.timestamp,
        deviceId,
        nextToken: result.data.nextToken,
        prevToken: result.data.prevToken
      })
    }

    case 'een_list_media': {
      const deviceId = args.deviceId as string
      const startTimestamp = args.startTimestamp as string
      if (!deviceId) {
        return errorResult('deviceId is required')
      }
      if (!startTimestamp) {
        return errorResult('startTimestamp is required')
      }

      const params: ListMediaParams = {
        deviceId,
        startTimestamp,
        endTimestamp: args.endTimestamp as string | undefined,
        type: (args.type as 'preview' | 'main') ?? 'preview',
        mediaType: (args.mediaType as 'video' | 'image') ?? 'video'
      }

      const result = await listMedia(params)
      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        intervals: result.data.results,
        totalCount: result.data.results.length,
        nextPageToken: result.data.nextPageToken
      })
    }

    // =========================================================================
    // Event Tools
    // =========================================================================
    case 'een_get_events': {
      const actor = args.actor as string
      const types = args.type__in as string[]
      const startTimestamp = args.startTimestamp as string

      if (!actor) {
        return errorResult('actor is required (e.g., "camera:100d4c41")')
      }
      if (!types || types.length === 0) {
        return errorResult('type__in is required (e.g., ["een.motionDetectionEvent.v1"])')
      }
      if (!startTimestamp) {
        return errorResult('startTimestamp is required')
      }

      // EEN API requires either startTimestamp__lte or endTimestamp__lte
      // Default endTimestamp to now if not provided
      const endTimestamp = (args.endTimestamp as string | undefined) ?? new Date().toISOString()

      const params: ListEventsParams = {
        actor,
        type__in: types,
        startTimestamp__gte: startTimestamp,
        startTimestamp__lte: endTimestamp,
        pageSize: args.pageSize as number | undefined,
        include: args.include as string[] | undefined
      }

      const result = await listEvents(params)
      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        events: result.data.results.map(e => ({
          id: e.id,
          type: e.type,
          startTimestamp: e.startTimestamp,
          endTimestamp: e.endTimestamp,
          actorId: e.actorId,
          actorType: e.actorType
        })),
        totalCount: result.data.results.length,
        nextPageToken: result.data.nextPageToken
      })
    }

    case 'een_get_event_types': {
      const result = await listEventTypes({
        pageSize: args.pageSize as number | undefined
      })

      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        eventTypes: result.data.results,
        totalCount: result.data.results.length,
        nextPageToken: result.data.nextPageToken
      })
    }

    // =========================================================================
    // User Tools
    // =========================================================================
    case 'een_get_current_user': {
      const result = await getCurrentUser()
      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult(result.data)
    }

    case 'een_get_users': {
      const result = await getUsers({
        pageSize: args.pageSize as number | undefined,
        pageToken: args.pageToken as string | undefined,
        include: args.include as string[] | undefined
      })

      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        users: result.data.results.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          isActive: u.isActive
        })),
        totalCount: result.data.results.length,
        nextPageToken: result.data.nextPageToken
      })
    }

    case 'een_get_user': {
      const userId = args.userId as string
      if (!userId) {
        return errorResult('userId is required')
      }

      const result = await getUser(userId, {
        include: args.include as string[] | undefined
      })

      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult(result.data)
    }

    // =========================================================================
    // Alert Tools
    // =========================================================================
    case 'een_get_alerts': {
      const params: ListAlertsParams = {
        actorId__in: args.actorId__in as string[] | undefined,
        timestamp__gte: args.timestamp__gte as string | undefined,
        timestamp__lte: args.timestamp__lte as string | undefined,
        alertType__in: args.alertType__in as string[] | undefined,
        pageSize: args.pageSize as number | undefined,
        include: args.include as ListAlertsParams['include']
      }

      const result = await listAlerts(params)
      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        alerts: result.data.results.map(a => ({
          id: a.id,
          alertType: a.alertType,
          alertName: a.alertName,
          timestamp: a.timestamp,
          actorId: a.actorId,
          actorName: a.actorName,
          priority: a.priority
        })),
        totalCount: result.data.results.length,
        nextPageToken: result.data.nextPageToken
      })
    }

    // =========================================================================
    // Bridge Tools
    // =========================================================================
    case 'een_get_bridges': {
      const params: ListBridgesParams = {
        pageSize: args.pageSize as number | undefined,
        pageToken: args.pageToken as string | undefined,
        include: args.include as string[] | undefined,
        status__in: args.status__in as ListBridgesParams['status__in']
      }

      const result = await getBridges(params)
      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        bridges: result.data.results.map(b => ({
          id: b.id,
          name: b.name,
          status: typeof b.status === 'string' ? b.status : b.status?.connectionStatus,
          cameraCount: b.cameraCount,
          tags: b.tags
        })),
        totalCount: result.data.results.length,
        nextPageToken: result.data.nextPageToken
      })
    }

    case 'een_get_bridge': {
      const bridgeId = args.bridgeId as string
      if (!bridgeId) {
        return errorResult('bridgeId is required')
      }

      const result = await getBridge(bridgeId, {
        include: args.include as string[] | undefined
      })

      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult(result.data)
    }

    // =========================================================================
    // Layout Tools
    // =========================================================================
    case 'een_get_layouts': {
      const params: ListLayoutsParams = {
        pageSize: args.pageSize as number | undefined,
        pageToken: args.pageToken as string | undefined,
        include: args.include as ListLayoutsParams['include'],
        name__contains: args.name__contains as string | undefined,
        q: args.q as string | undefined
      }

      const result = await getLayouts(params)
      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        layouts: result.data.results.map(l => ({
          id: l.id,
          name: l.name,
          paneCount: l.panes.length,
          cameraIds: l.panes.map(p => p.cameraId),
          settings: {
            columns: l.settings.paneColumns,
            aspectRatio: l.settings.cameraAspectRatio,
            showBorder: l.settings.showCameraBorder,
            showName: l.settings.showCameraName
          }
        })),
        totalCount: result.data.results.length,
        nextPageToken: result.data.nextPageToken
      })
    }

    case 'een_get_layout': {
      const layoutId = args.layoutId as string
      if (!layoutId) {
        return errorResult('layoutId is required')
      }

      const result = await getLayout(layoutId, {
        include: args.include as GetLayoutParams['include']
      })

      if (result.error) {
        return errorResult(result.error.message)
      }

      return textResult({
        id: result.data.id,
        name: result.data.name,
        accountId: result.data.accountId,
        settings: result.data.settings,
        panes: result.data.panes.map(p => ({
          id: p.id,
          name: p.name,
          cameraId: p.cameraId,
          type: p.type,
          size: p.size
        })),
        effectivePermissions: result.data.effectivePermissions,
        resourceCounts: result.data.resourceCounts
      })
    }

    // =========================================================================
    // Unknown Tool
    // =========================================================================
    default:
      return errorResult(`Unknown tool: ${toolName}`)
  }
}
