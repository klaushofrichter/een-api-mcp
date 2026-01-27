/**
 * Stored account credentials.
 */
export interface StoredAccount {
  /** Refresh token for obtaining new access tokens */
  refreshToken: string
  /** Current access token */
  accessToken: string
  /** Timestamp when access token expires (milliseconds since epoch) */
  accessTokenExpiresAt: number
  /** Regional API base URL (e.g., https://c001.eagleeyenetworks.com) */
  baseUrl: string
  /** EEN user ID */
  userId?: string
  /** User display name */
  userName?: string
  /** Timestamp when credentials were created */
  createdAt: number
  /** Timestamp when tokens were last refreshed */
  lastRefreshedAt: number
  /** Encrypted password for automatic re-authentication (optional) */
  password?: string
}

/**
 * Credentials file structure stored in ~/.een-mcp/credentials.json
 */
export interface CredentialsFile {
  /** Map of account email to stored account data */
  accounts: Record<string, StoredAccount>
  /** OAuth client ID */
  clientId: string
  /** OAuth client secret (encrypted) */
  clientSecret: string
}

/**
 * Token response from EEN OAuth endpoint.
 */
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
  httpsBaseUrl?: string | { hostname: string; port?: number }
}

/**
 * Result from OAuth login process.
 */
export interface LoginResult {
  accountId: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  baseUrl: string
  userId?: string
  userName?: string
}

/**
 * Account status information.
 */
export interface AccountStatus {
  accountId: string
  baseUrl: string
  userId?: string
  userName?: string
  hasPassword: boolean
  accessTokenExpiresAt: number
  accessTokenValid: boolean
  createdAt: number
  lastRefreshedAt: number
}

/**
 * Authentication status for all accounts.
 */
export interface AuthStatus {
  accounts: AccountStatus[]
  activeAccount: string | null
}
