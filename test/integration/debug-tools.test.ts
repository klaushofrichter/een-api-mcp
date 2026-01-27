/**
 * Debug Tests to investigate failing API calls
 */

import { describe, it, beforeAll } from 'vitest'
import { config } from 'dotenv'
import { handleToolCall } from '../../src/tools/handlers.js'
import { loadCredentials, setActiveAccount, listAccounts } from '../../src/auth/token-manager.js'

config()

const TEST_ACCOUNT = process.env.TEST_USER ?? 'klaus+developer@klaushofrichter.net'

describe('Debug Tests', () => {
  beforeAll(() => {
    const loadResult = loadCredentials()
    if (loadResult.error) throw new Error(loadResult.error.message)

    const accounts = listAccounts()
    const accountToUse = accounts.includes(TEST_ACCOUNT) ? TEST_ACCOUNT : accounts[0]!
    setActiveAccount(accountToUse)
    console.log(`Using account: ${accountToUse}`)
  })

  it('debug een_list_media', async () => {
    // First get a camera
    const camerasResult = await handleToolCall('een_get_cameras', { pageSize: 1 })
    console.log('Cameras result:', JSON.stringify(camerasResult, null, 2))

    const camerasData = JSON.parse((camerasResult.content[0] as { text: string }).text)
    if (camerasData.cameras.length === 0) {
      console.log('No cameras found')
      return
    }

    const cameraId = camerasData.cameras[0].id
    console.log('Camera ID:', cameraId)

    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000)

    console.log('Calling een_list_media with:', {
      deviceId: cameraId,
      startTimestamp: startTime.toISOString(),
      endTimestamp: endTime.toISOString(),
      type: 'preview',
      mediaType: 'video'
    })

    const result = await handleToolCall('een_list_media', {
      deviceId: cameraId,
      startTimestamp: startTime.toISOString(),
      endTimestamp: endTime.toISOString(),
      type: 'preview',
      mediaType: 'video'
    })

    console.log('een_list_media result:', JSON.stringify(result, null, 2))
  })

  it('debug een_get_event_types', async () => {
    const result = await handleToolCall('een_get_event_types', { pageSize: 50 })
    console.log('een_get_event_types result:', JSON.stringify(result, null, 2))
  })

  it('debug een_get_events', async () => {
    // First get a camera
    const camerasResult = await handleToolCall('een_get_cameras', { pageSize: 1 })
    const camerasData = JSON.parse((camerasResult.content[0] as { text: string }).text)
    if (camerasData.cameras.length === 0) {
      console.log('No cameras found')
      return
    }

    const cameraId = camerasData.cameras[0].id
    console.log('Camera ID:', cameraId)

    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    console.log('Calling een_get_events with:', {
      actor: `camera:${cameraId}`,
      type__in: ['een.motionDetectionEvent.v1'],
      startTimestamp: startTime,
      pageSize: 10
    })

    const result = await handleToolCall('een_get_events', {
      actor: `camera:${cameraId}`,
      type__in: ['een.motionDetectionEvent.v1'],
      startTimestamp: startTime,
      pageSize: 10
    })

    console.log('een_get_events result:', JSON.stringify(result, null, 2))
  })
})
