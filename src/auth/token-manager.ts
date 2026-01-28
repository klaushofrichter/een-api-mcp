/**
 * Token Manager
 *
 * Handles credential storage, token refresh, and automatic re-authentication.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { encryptPassword, decryptPassword } from './crypto.js'
import type {
  CredentialsFile,
  StoredAccount,
  AccountStatus,
  AuthStatus,
  TokenResponse
} from '../types/index.js'
import { success, failure, type Result } from '../types/index.js'

// Configuration
const CREDENTIALS_DIR = process.env.EEN_CREDENTIALS_PATH
  ? path.dirname(process.env.EEN_CREDENTIALS_PATH)
  : path.join(os.homedir(), '.een-mcp')
const CREDENTIALS_FILE = process.env.EEN_CREDENTIALS_PATH
  ?? path.join(CREDENTIALS_DIR, 'credentials.json')
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // 5 minutes before actual expiry

// In-memory state
let credentials: CredentialsFile | null = null
let activeAccountId: string | null = null

/**
 * Get the configured client ID.
 */
export function getClientId(): string | null {
  return credentials?.clientId ?? process.env.EEN_CLIENT_ID ?? null
}

/**
 * Get the configured client secret.
 */
export function getClientSecret(): string | null {
  if (credentials?.clientSecret) {
    try {
      return decryptPassword(credentials.clientSecret)
    } catch {
      return credentials.clientSecret // Fallback if not encrypted
    }
  }
  return process.env.EEN_CLIENT_SECRET ?? null
}

/**
 * Load credentials from file.
 */
export function loadCredentials(): Result<CredentialsFile> {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    return failure('AUTH_REQUIRED', 'No credentials file found. Run the auth CLI to login first.')
  }

  try {
    // Check file permissions on Unix systems
    if (process.platform !== 'win32') {
      const stats = fs.statSync(CREDENTIALS_FILE)
      const mode = stats.mode & 0o777
      if (mode !== 0o600) {
        console.warn(`Warning: Credentials file has insecure permissions (${mode.toString(8)}). Should be 600.`)
      }
    }

    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8')
    credentials = JSON.parse(data) as CredentialsFile
    return success(credentials)
  } catch (err) {
    return failure('AUTH_FAILED', `Failed to load credentials: ${String(err)}`)
  }
}

/**
 * Save credentials to file.
 */
export function saveCredentials(): Result<void> {
  if (!credentials) {
    return failure('AUTH_FAILED', 'No credentials to save')
  }

  try {
    // Ensure directory exists
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 })
    }

    // Write with restricted permissions
    fs.writeFileSync(
      CREDENTIALS_FILE,
      JSON.stringify(credentials, null, 2),
      { mode: 0o600 }
    )

    return success(undefined)
  } catch (err) {
    return failure('AUTH_FAILED', `Failed to save credentials: ${String(err)}`)
  }
}

/**
 * Initialize credentials file with client credentials.
 */
export function initCredentials(clientId: string, clientSecret: string): void {
  if (!credentials) {
    credentials = {
      accounts: {},
      clientId,
      clientSecret: encryptPassword(clientSecret)
    }
  } else {
    credentials.clientId = clientId
    credentials.clientSecret = encryptPassword(clientSecret)
  }
}

/**
 * Get a specific account by ID.
 */
export function getAccount(accountId: string): StoredAccount | null {
  return credentials?.accounts[accountId] ?? null
}

/**
 * Store account credentials.
 */
export function setAccount(
  accountId: string,
  account: StoredAccount,
  persistPassword?: string
): void {
  if (!credentials) {
    credentials = {
      accounts: {},
      clientId: process.env.EEN_CLIENT_ID ?? '',
      clientSecret: process.env.EEN_CLIENT_SECRET ?? ''
    }
  }

  const storedAccount: StoredAccount = {
    ...account
  }

  if (persistPassword) {
    storedAccount.password = encryptPassword(persistPassword)
  }

  credentials.accounts[accountId] = storedAccount
}

/**
 * Remove an account.
 */
export function removeAccount(accountId: string): boolean {
  if (credentials?.accounts[accountId]) {
    delete credentials.accounts[accountId]
    if (activeAccountId === accountId) {
      activeAccountId = null
    }
    return true
  }
  return false
}

/**
 * List all configured account IDs.
 */
export function listAccounts(): string[] {
  return Object.keys(credentials?.accounts ?? {})
}

/**
 * Get the currently selected account.
 */
export function getActiveAccount(): StoredAccount | null {
  if (!activeAccountId) {
    return null
  }
  return getAccount(activeAccountId)
}

/**
 * Get the active account ID.
 */
export function getActiveAccountId(): string | null {
  return activeAccountId
}

/**
 * Select account for API calls.
 */
export function setActiveAccount(accountId: string): Result<void> {
  const account = getAccount(accountId)
  if (!account) {
    return failure('ACCOUNT_NOT_FOUND', `Account '${accountId}' not found. Run 'npx tsx cli/auth.ts list' to see configured accounts.`)
  }
  activeAccountId = accountId
  return success(undefined)
}

/**
 * Get active account or return error if none selected.
 * Auto-selects the first account if only one is configured and none is selected.
 */
export function requireActiveAccount(): Result<{ accountId: string; account: StoredAccount }> {
  // If no account is selected, try to auto-select
  if (!activeAccountId) {
    const accounts = listAccounts()

    if (accounts.length === 0) {
      return failure('NO_ACCOUNTS', 'No accounts configured. Run the auth CLI to login first.')
    }

    if (accounts.length === 1) {
      // Auto-select the only available account
      activeAccountId = accounts[0]!
      // Note: Silently auto-select to avoid interfering with MCP output
    } else {
      // Multiple accounts - list them in the error message
      return failure(
        'NO_ACTIVE_ACCOUNT',
        `No account selected. Use een_set_account to select one of: ${accounts.join(', ')}`
      )
    }
  }

  const account = getAccount(activeAccountId)
  if (!account) {
    return failure('ACCOUNT_NOT_FOUND', `Active account '${activeAccountId}' not found`)
  }

  return success({ accountId: activeAccountId, account })
}

/**
 * Check if a token is expired.
 */
export function isTokenExpired(account: StoredAccount): boolean {
  return Date.now() + TOKEN_EXPIRY_BUFFER_MS >= account.accessTokenExpiresAt
}

/**
 * Refresh access token using refresh token.
 */
export async function refreshAccessToken(accountId: string): Promise<Result<void>> {
  const account = getAccount(accountId)
  if (!account) {
    return failure('ACCOUNT_NOT_FOUND', `Account '${accountId}' not found`)
  }

  const clientId = getClientId()
  const clientSecret = getClientSecret()

  if (!clientId || !clientSecret) {
    return failure('AUTH_FAILED', 'Client credentials not configured')
  }

  try {
    const response = await fetch('https://auth.eagleeyenetworks.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return failure('AUTH_FAILED', `Token refresh failed: ${response.status} ${errorText}`)
    }

    const data = await response.json() as TokenResponse

    // Update stored credentials
    account.accessToken = data.access_token
    account.accessTokenExpiresAt = Date.now() + (data.expires_in * 1000)
    if (data.refresh_token) {
      account.refreshToken = data.refresh_token // Token rotation
    }
    account.lastRefreshedAt = Date.now()

    // Update base URL if provided
    if (data.httpsBaseUrl) {
      if (typeof data.httpsBaseUrl === 'string') {
        account.baseUrl = data.httpsBaseUrl
      } else {
        const { hostname, port } = data.httpsBaseUrl
        account.baseUrl = port ? `https://${hostname}:${port}` : `https://${hostname}`
      }
    }

    const saveResult = saveCredentials()
    if (saveResult.error) {
      console.warn('Warning: Failed to save refreshed credentials:', saveResult.error.message)
    }

    return success(undefined)
  } catch (err) {
    return failure('NETWORK_ERROR', `Token refresh failed: ${String(err)}`)
  }
}

/**
 * Get decrypted password for an account.
 */
export function getAccountPassword(accountId: string): string | null {
  const account = getAccount(accountId)
  if (!account?.password) {
    return null
  }
  try {
    return decryptPassword(account.password)
  } catch {
    return null
  }
}

/**
 * Ensure account has a valid token, refreshing or re-authenticating if needed.
 */
export async function ensureValidToken(accountId: string): Promise<Result<void>> {
  const account = getAccount(accountId)
  if (!account) {
    return failure('ACCOUNT_NOT_FOUND', `Account '${accountId}' not found`)
  }

  // Token is still valid
  if (!isTokenExpired(account)) {
    return success(undefined)
  }

  // Try to refresh
  const refreshResult = await refreshAccessToken(accountId)
  if (!refreshResult.error) {
    return success(undefined)
  }

  // Refresh failed - try re-authentication if password is stored
  const password = getAccountPassword(accountId)
  if (password) {
    // Dynamic import of playwright to avoid loading it unless needed
    try {
      const { performOAuthLogin } = await import('./oauth.js')
      const clientId = getClientId()
      const clientSecret = getClientSecret()

      if (!clientId || !clientSecret) {
        return failure('AUTH_FAILED', 'Client credentials not configured for re-authentication')
      }

      const loginResult = await performOAuthLogin(accountId, password, clientId, clientSecret)
      if (loginResult.error) {
        return failure('AUTH_FAILED', `Re-authentication failed: ${loginResult.error.message}`)
      }

      // Update account with new tokens
      if (loginResult.data) {
        account.accessToken = loginResult.data.accessToken
        account.refreshToken = loginResult.data.refreshToken
        account.accessTokenExpiresAt = Date.now() + (loginResult.data.expiresIn * 1000)
        account.baseUrl = loginResult.data.baseUrl
        account.lastRefreshedAt = Date.now()
        if (loginResult.data.userId) {
          account.userId = loginResult.data.userId
        }
        if (loginResult.data.userName) {
          account.userName = loginResult.data.userName
        }

        const saveResult = saveCredentials()
        if (saveResult.error) {
          console.warn('Warning: Failed to save re-authenticated credentials:', saveResult.error.message)
        }

        return success(undefined)
      }
    } catch (err) {
      return failure('AUTH_FAILED', `Re-authentication failed: ${String(err)}`)
    }
  }

  // No password stored - return auth expired error
  return failure('AUTH_EXPIRED', `Token expired for account '${accountId}'. Run 'npx tsx cli/auth.ts login' to re-authenticate.`)
}

/**
 * Get authentication status for all accounts.
 */
export function getAuthStatus(): AuthStatus {
  const accountStatuses: AccountStatus[] = []

  for (const [accountId, account] of Object.entries(credentials?.accounts ?? {})) {
    accountStatuses.push({
      accountId,
      baseUrl: account.baseUrl,
      userId: account.userId,
      userName: account.userName,
      hasPassword: !!account.password,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
      accessTokenValid: !isTokenExpired(account),
      createdAt: account.createdAt,
      lastRefreshedAt: account.lastRefreshedAt
    })
  }

  return {
    accounts: accountStatuses,
    activeAccount: activeAccountId
  }
}

/**
 * Get credentials file path.
 */
export function getCredentialsPath(): string {
  return CREDENTIALS_FILE
}
