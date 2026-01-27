/**
 * OAuth Authentication using Playwright
 *
 * Performs headless browser-based OAuth authentication with Eagle Eye Networks.
 */

import type { LoginResult, TokenResponse } from '../types/index.js'
import { success, failure, type Result } from '../types/index.js'

const REDIRECT_URI = 'http://127.0.0.1:3333'

/**
 * Perform OAuth login via headless browser automation.
 */
export async function performOAuthLogin(
  username: string,
  password: string,
  clientId: string,
  clientSecret: string
): Promise<Result<LoginResult>> {
  // Dynamic import of playwright to avoid loading it unless needed
  const { chromium } = await import('playwright')

  let browser = null

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    // Generate state for CSRF protection
    const state = crypto.randomUUID()

    // Set up request interception to capture redirect URL
    let redirectUrl: string | null = null
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('127.0.0.1:3333') && url.includes('code=')) {
        redirectUrl = url
      }
    })

    // Build OAuth URL
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'vms.all',
      redirect_uri: REDIRECT_URI,
      state
    })

    const authUrl = `https://auth.eagleeyenetworks.com/oauth2/authorize?${authParams.toString()}`

    // Navigate to OAuth
    await page.goto(authUrl)
    await page.waitForURL(/.*eagleeyenetworks.com.*/, { timeout: 15000 })

    // Fill email
    const emailInput = page.locator('#authentication--input__email')
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })
    await emailInput.fill(username)

    // Click next
    await page.getByRole('button', { name: 'Next' }).click()

    // Fill password
    const passwordInput = page.locator('#authentication--input__password')
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
    await passwordInput.fill(password)

    // Click sign in
    const signInButton = page.locator('#next')
    try {
      await signInButton.click()
    } catch {
      await page.getByRole('button', { name: 'Sign in' }).click()
    }

    // Wait for redirect
    try {
      await page.waitForURL(/127\.0\.0\.1:3333.*code=/, { timeout: 30000 })
    } catch {
      // Expected - no server running, check if we captured the redirect URL
      if (!redirectUrl) {
        const currentUrl = page.url()
        if (currentUrl.includes('code=')) {
          redirectUrl = currentUrl
        }
      }
    }

    if (!redirectUrl) {
      return failure('AUTH_FAILED', 'Failed to capture redirect URL with authorization code. Check credentials.')
    }

    // Extract code and validate state
    const url = new URL(redirectUrl)
    const code = url.searchParams.get('code')
    const returnedState = url.searchParams.get('state')

    if (!code) {
      return failure('AUTH_FAILED', 'No authorization code received')
    }

    if (returnedState !== state) {
      return failure('AUTH_FAILED', 'State mismatch - possible CSRF attack')
    }

    // Exchange code for token directly with EEN (not via proxy)
    const tokenResponse = await fetch('https://auth.eagleeyenetworks.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      return failure('AUTH_FAILED', `Token exchange failed: ${tokenResponse.status} ${errorText}`)
    }

    const tokenData = await tokenResponse.json() as TokenResponse

    // Parse baseUrl
    let baseUrl: string
    if (typeof tokenData.httpsBaseUrl === 'string') {
      baseUrl = tokenData.httpsBaseUrl
    } else if (tokenData.httpsBaseUrl) {
      const { hostname, port } = tokenData.httpsBaseUrl
      baseUrl = port ? `https://${hostname}:${port}` : `https://${hostname}`
    } else {
      // Fallback - fetch from /api/v3.0/authorizationSources
      baseUrl = 'https://api.eagleeyenetworks.com'
    }

    // Get user info
    let userId: string | undefined
    let userName: string | undefined

    try {
      const userResponse = await fetch(`${baseUrl}/api/v3.0/users/self`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      })

      if (userResponse.ok) {
        const userData = await userResponse.json() as { id: string; firstName?: string; lastName?: string }
        userId = userData.id
        userName = [userData.firstName, userData.lastName].filter(Boolean).join(' ') || undefined
      }
    } catch {
      // User info is optional, continue without it
    }

    return success({
      accountId: username,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? '',
      expiresIn: tokenData.expires_in,
      baseUrl,
      userId,
      userName
    })
  } catch (err) {
    return failure('AUTH_FAILED', `OAuth login failed: ${String(err)}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Revoke tokens for an account.
 */
export async function revokeToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<Result<void>> {
  try {
    const response = await fetch('https://auth.eagleeyenetworks.com/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        token: refreshToken,
        token_type_hint: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return failure('AUTH_FAILED', `Token revocation failed: ${response.status} ${errorText}`)
    }

    return success(undefined)
  } catch (err) {
    return failure('NETWORK_ERROR', `Token revocation failed: ${String(err)}`)
  }
}
