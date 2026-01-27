/**
 * Integration Tests for MCP Tools
 *
 * These tests run against the live EEN API using the configured test account.
 * Requires a valid account to be configured via the auth CLI first.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { config } from 'dotenv'
import { handleToolCall } from '../../src/tools/handlers.js'
import { loadCredentials, setActiveAccount, listAccounts } from '../../src/auth/token-manager.js'

// Load environment variables
config()

// Test account - should be configured via auth CLI before running tests
const TEST_ACCOUNT = process.env.TEST_USER ?? 'klaus+developer@klaushofrichter.net'

describe('MCP Tools Integration Tests', () => {
  beforeAll(() => {
    // Load credentials and set active account
    const loadResult = loadCredentials()
    if (loadResult.error) {
      throw new Error(`Failed to load credentials: ${loadResult.error.message}. Run 'npx tsx cli/auth.ts login' first.`)
    }

    const accounts = listAccounts()
    if (accounts.length === 0) {
      throw new Error('No accounts configured. Run the auth CLI to login first.')
    }

    // Use the test account or the first available account
    const accountToUse = accounts.includes(TEST_ACCOUNT) ? TEST_ACCOUNT : accounts[0]!
    const setResult = setActiveAccount(accountToUse)
    if (setResult.error) {
      throw new Error(`Failed to set active account: ${setResult.error.message}`)
    }

    console.log(`Using account: ${accountToUse}`)
  })

  // ==========================================================================
  // Authentication Tools
  // ==========================================================================

  describe('Authentication Tools', () => {
    it('een_auth_status should return account status', async () => {
      const result = await handleToolCall('een_auth_status', {})

      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)
      expect(result.content[0]?.type).toBe('text')

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.accounts).toBeDefined()
      expect(Array.isArray(data.accounts)).toBe(true)
      expect(data.accounts.length).toBeGreaterThan(0)

      // Check account structure
      const account = data.accounts[0]
      expect(account.accountId).toBeDefined()
      expect(account.baseUrl).toBeDefined()
      expect(account.tokenValid).toBeDefined()
    })

    it('een_list_accounts should return configured accounts', async () => {
      const result = await handleToolCall('een_list_accounts', {})

      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.accounts).toBeDefined()
      expect(Array.isArray(data.accounts)).toBe(true)
      expect(data.accounts.length).toBeGreaterThan(0)
    })

    it('een_set_account should set active account', async () => {
      const accounts = listAccounts()
      const result = await handleToolCall('een_set_account', {
        accountId: accounts[0]
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.success).toBe(true)
      expect(data.activeAccount).toBe(accounts[0])
    })

    it('een_set_account should fail for invalid account', async () => {
      const result = await handleToolCall('een_set_account', {
        accountId: 'nonexistent@example.com'
      })

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('Error')
    })
  })

  // ==========================================================================
  // Camera Tools
  // ==========================================================================

  describe('Camera Tools', () => {
    let cameraId: string | null = null

    it('een_get_cameras should return camera list', async () => {
      const result = await handleToolCall('een_get_cameras', {
        pageSize: 10
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.cameras).toBeDefined()
      expect(Array.isArray(data.cameras)).toBe(true)

      // Store first camera ID for subsequent tests
      if (data.cameras.length > 0) {
        cameraId = data.cameras[0].id
        console.log(`Found camera: ${data.cameras[0].name} (${cameraId})`)
      }
    })

    it('een_get_cameras should support filtering by status', async () => {
      const result = await handleToolCall('een_get_cameras', {
        status__in: ['online'],
        pageSize: 5
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.cameras).toBeDefined()

      // All returned cameras should be online
      for (const camera of data.cameras) {
        if (camera.status) {
          expect(['online', 'streaming']).toContain(camera.status)
        }
      }
    })

    it('een_get_cameras should support name search', async () => {
      const result = await handleToolCall('een_get_cameras', {
        q: 'camera',
        pageSize: 5
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.cameras).toBeDefined()
    })

    it('een_get_camera should return camera details', async () => {
      if (!cameraId) {
        console.log('Skipping: No camera available')
        return
      }

      const result = await handleToolCall('een_get_camera', {
        cameraId,
        include: ['deviceInfo', 'status']
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.id).toBe(cameraId)
      expect(data.name).toBeDefined()
    })

    it('een_get_camera should fail for invalid camera ID', async () => {
      const result = await handleToolCall('een_get_camera', {
        cameraId: 'invalid-camera-id-12345'
      })

      expect(result.isError).toBe(true)
    })
  })

  // ==========================================================================
  // Media Tools
  // ==========================================================================

  describe('Media Tools', () => {
    let cameraId: string | null = null

    beforeAll(async () => {
      // Get a camera ID for media tests
      const result = await handleToolCall('een_get_cameras', {
        status__in: ['online'],
        pageSize: 1
      })

      if (!result.isError) {
        const data = JSON.parse((result.content[0] as { text: string }).text)
        if (data.cameras.length > 0) {
          cameraId = data.cameras[0].id
        }
      }
    })

    it('een_get_live_image should return a live snapshot', async () => {
      if (!cameraId) {
        console.log('Skipping: No online camera available')
        return
      }

      const result = await handleToolCall('een_get_live_image', {
        deviceId: cameraId
      })

      expect(result.isError).toBeFalsy()
      expect(result.content.length).toBeGreaterThanOrEqual(1)

      // Should have an image content
      const imageContent = result.content.find(c => c.type === 'image')
      expect(imageContent).toBeDefined()
      expect((imageContent as { data: string }).data).toBeDefined()
      expect((imageContent as { mimeType: string }).mimeType).toBe('image/jpeg')

      // Should have metadata
      const textContent = result.content.find(c => c.type === 'text')
      if (textContent) {
        const metadata = JSON.parse((textContent as { text: string }).text)
        expect(metadata.deviceId).toBe(cameraId)
      }
    }, 60000) // Increase timeout for live image

    it('een_get_live_image should fail for invalid device', async () => {
      const result = await handleToolCall('een_get_live_image', {
        deviceId: 'invalid-device-12345'
      })

      expect(result.isError).toBe(true)
    })

    it('een_list_media should return recording intervals', async () => {
      if (!cameraId) {
        console.log('Skipping: No online camera available')
        return
      }

      // Query for recordings from the last hour
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000)

      const result = await handleToolCall('een_list_media', {
        deviceId: cameraId,
        startTimestamp: startTime.toISOString(),
        endTimestamp: endTime.toISOString(),
        type: 'preview',
        mediaType: 'video'
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.intervals).toBeDefined()
      expect(Array.isArray(data.intervals)).toBe(true)
    })

    it('een_get_recorded_image should return historical image', async () => {
      if (!cameraId) {
        console.log('Skipping: No online camera available')
        return
      }

      // Try to get an image from 5 minutes ago
      const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const result = await handleToolCall('een_get_recorded_image', {
        deviceId: cameraId,
        timestamp__gte: timestamp,
        type: 'preview'
      })

      // This may fail if no recording is available, which is acceptable
      if (!result.isError) {
        expect(result.content.length).toBeGreaterThanOrEqual(1)

        const imageContent = result.content.find(c => c.type === 'image')
        if (imageContent) {
          expect((imageContent as { data: string }).data).toBeDefined()
        }
      }
    }, 60000)
  })

  // ==========================================================================
  // User Tools
  // ==========================================================================

  describe('User Tools', () => {
    it('een_get_current_user should return authenticated user', async () => {
      const result = await handleToolCall('een_get_current_user', {})

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.id).toBeDefined()
      expect(data.email).toBeDefined()
      expect(data.firstName).toBeDefined()
      expect(data.lastName).toBeDefined()
    })

    it('een_get_users should return user list', async () => {
      const result = await handleToolCall('een_get_users', {
        pageSize: 10
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.users).toBeDefined()
      expect(Array.isArray(data.users)).toBe(true)
      expect(data.users.length).toBeGreaterThan(0)

      // Check user structure
      const user = data.users[0]
      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()
    })

    it('een_get_user should return specific user', async () => {
      // First get the current user ID
      const currentUserResult = await handleToolCall('een_get_current_user', {})
      const currentUser = JSON.parse((currentUserResult.content[0] as { text: string }).text)

      const result = await handleToolCall('een_get_user', {
        userId: currentUser.id
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.id).toBe(currentUser.id)
    })
  })

  // ==========================================================================
  // Bridge Tools
  // ==========================================================================

  describe('Bridge Tools', () => {
    let bridgeId: string | null = null

    it('een_get_bridges should return bridge list', async () => {
      const result = await handleToolCall('een_get_bridges', {
        pageSize: 10
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.bridges).toBeDefined()
      expect(Array.isArray(data.bridges)).toBe(true)

      if (data.bridges.length > 0) {
        bridgeId = data.bridges[0].id
        console.log(`Found bridge: ${data.bridges[0].name} (${bridgeId})`)
      }
    })

    it('een_get_bridges should support status filtering', async () => {
      const result = await handleToolCall('een_get_bridges', {
        status__in: ['online'],
        pageSize: 5
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.bridges).toBeDefined()
    })

    it('een_get_bridge should return bridge details', async () => {
      if (!bridgeId) {
        console.log('Skipping: No bridge available')
        return
      }

      const result = await handleToolCall('een_get_bridge', {
        bridgeId,
        include: ['deviceInfo', 'networkInfo']
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.id).toBe(bridgeId)
      expect(data.name).toBeDefined()
    })
  })

  // ==========================================================================
  // Event Tools
  // ==========================================================================

  describe('Event Tools', () => {
    let cameraId: string | null = null

    beforeAll(async () => {
      // Get a camera ID for event tests
      const result = await handleToolCall('een_get_cameras', {
        pageSize: 1
      })

      if (!result.isError) {
        const data = JSON.parse((result.content[0] as { text: string }).text)
        if (data.cameras.length > 0) {
          cameraId = data.cameras[0].id
        }
      }
    })

    it('een_get_event_types should return event type list', async () => {
      const result = await handleToolCall('een_get_event_types', {
        pageSize: 50
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.eventTypes).toBeDefined()
      expect(Array.isArray(data.eventTypes)).toBe(true)

      if (data.eventTypes.length > 0) {
        console.log(`Found ${data.eventTypes.length} event types`)
        console.log('Sample types:', data.eventTypes.slice(0, 5).map((t: { type: string }) => t.type))
      }
    })

    it('een_get_events should return events for a camera', async () => {
      if (!cameraId) {
        console.log('Skipping: No camera available')
        return
      }

      // Query for events from the last 24 hours
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const result = await handleToolCall('een_get_events', {
        actor: `camera:${cameraId}`,
        type__in: ['een.motionDetectionEvent.v1'],
        startTimestamp: startTime,
        pageSize: 10
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.events).toBeDefined()
      expect(Array.isArray(data.events)).toBe(true)

      if (data.events.length > 0) {
        console.log(`Found ${data.events.length} motion events`)

        // Check event structure
        const event = data.events[0]
        expect(event.id).toBeDefined()
        expect(event.type).toBe('een.motionDetectionEvent.v1')
        expect(event.startTimestamp).toBeDefined()
      }
    })

    it('een_get_events should require actor parameter', async () => {
      const result = await handleToolCall('een_get_events', {
        type__in: ['een.motionDetectionEvent.v1'],
        startTimestamp: new Date().toISOString()
      })

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('actor is required')
    })

    it('een_get_events should require type__in parameter', async () => {
      const result = await handleToolCall('een_get_events', {
        actor: 'camera:test',
        startTimestamp: new Date().toISOString()
      })

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('type__in is required')
    })
  })

  // ==========================================================================
  // Alert Tools
  // ==========================================================================

  describe('Alert Tools', () => {
    it('een_get_alerts should return alert list', async () => {
      // Query for alerts from the last 7 days
      const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const result = await handleToolCall('een_get_alerts', {
        timestamp__gte: startTime,
        pageSize: 10
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.alerts).toBeDefined()
      expect(Array.isArray(data.alerts)).toBe(true)

      if (data.alerts.length > 0) {
        console.log(`Found ${data.alerts.length} alerts`)

        // Check alert structure
        const alert = data.alerts[0]
        expect(alert.id).toBeDefined()
        expect(alert.alertType).toBeDefined()
        expect(alert.timestamp).toBeDefined()
      }
    })

    it('een_get_alerts should support filtering by actor', async () => {
      // First get a camera ID
      const camerasResult = await handleToolCall('een_get_cameras', { pageSize: 1 })
      if (camerasResult.isError) {
        console.log('Skipping: Could not get cameras')
        return
      }

      const camerasData = JSON.parse((camerasResult.content[0] as { text: string }).text)
      if (camerasData.cameras.length === 0) {
        console.log('Skipping: No cameras available')
        return
      }

      const cameraId = camerasData.cameras[0].id
      const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const result = await handleToolCall('een_get_alerts', {
        actorId__in: [cameraId],
        timestamp__gte: startTime,
        pageSize: 10
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.alerts).toBeDefined()

      // All alerts should be from the specified camera
      for (const alert of data.alerts) {
        expect(alert.actorId).toBe(cameraId)
      }
    })
  })

  // ==========================================================================
  // Layout Tools
  // ==========================================================================

  describe('Layout Tools', () => {
    it('een_get_layouts should return layout list', async () => {
      const result = await handleToolCall('een_get_layouts', { pageSize: 10 })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.layouts).toBeDefined()
      expect(Array.isArray(data.layouts)).toBe(true)
      expect(data.totalCount).toBeDefined()

      if (data.layouts.length > 0) {
        console.log(`Found ${data.layouts.length} layouts`)

        // Check layout structure
        const layout = data.layouts[0]
        expect(layout.id).toBeDefined()
        expect(layout.name).toBeDefined()
        expect(layout.paneCount).toBeDefined()
        expect(layout.cameraIds).toBeDefined()
        expect(layout.settings).toBeDefined()
      }
    })

    it('een_get_layouts should support name filtering', async () => {
      // First get any layout to use its name for filtering
      const allResult = await handleToolCall('een_get_layouts', { pageSize: 1 })
      if (allResult.isError) {
        console.log('Skipping: Could not get layouts')
        return
      }

      const allData = JSON.parse((allResult.content[0] as { text: string }).text)
      if (allData.layouts.length === 0) {
        console.log('Skipping: No layouts available')
        return
      }

      const layoutName = allData.layouts[0].name
      // Use part of the name for contains search
      const searchTerm = layoutName.substring(0, Math.min(5, layoutName.length))

      const result = await handleToolCall('een_get_layouts', {
        name__contains: searchTerm
      })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.layouts).toBeDefined()

      // All returned layouts should contain the search term
      for (const layout of data.layouts) {
        expect(layout.name.toLowerCase()).toContain(searchTerm.toLowerCase())
      }
    })

    it('een_get_layout should return layout details', async () => {
      // First get a layout ID
      const layoutsResult = await handleToolCall('een_get_layouts', { pageSize: 1 })
      if (layoutsResult.isError) {
        console.log('Skipping: Could not get layouts')
        return
      }

      const layoutsData = JSON.parse((layoutsResult.content[0] as { text: string }).text)
      if (layoutsData.layouts.length === 0) {
        console.log('Skipping: No layouts available')
        return
      }

      const layoutId = layoutsData.layouts[0].id
      console.log(`Getting details for layout: ${layoutId}`)

      const result = await handleToolCall('een_get_layout', { layoutId })

      expect(result.isError).toBeFalsy()

      const data = JSON.parse((result.content[0] as { text: string }).text)
      expect(data.id).toBe(layoutId)
      expect(data.name).toBeDefined()
      expect(data.settings).toBeDefined()
      expect(data.panes).toBeDefined()
      expect(Array.isArray(data.panes)).toBe(true)

      // Check settings structure
      expect(data.settings.paneColumns).toBeDefined()
      expect(data.settings.cameraAspectRatio).toBeDefined()
    })

    it('een_get_layout should fail for invalid layout ID', async () => {
      const result = await handleToolCall('een_get_layout', {
        layoutId: 'invalid-layout-id-12345'
      })

      expect(result.isError).toBe(true)
    })

    it('een_get_layout should require layoutId parameter', async () => {
      const result = await handleToolCall('een_get_layout', {})

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('layoutId is required')
    })
  })

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return error for unknown tool', async () => {
      const result = await handleToolCall('een_unknown_tool', {})

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('Unknown tool')
    })

    it('should return error for missing required parameters', async () => {
      const result = await handleToolCall('een_get_camera', {})

      expect(result.isError).toBe(true)
      expect((result.content[0] as { text: string }).text).toContain('cameraId is required')
    })
  })
})
