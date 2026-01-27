#!/usr/bin/env npx tsx
/**
 * Auth CLI for EEN MCP Server
 *
 * Manages OAuth authentication for Eagle Eye Networks accounts.
 *
 * Usage:
 *   npx tsx cli/auth.ts login --username user@example.com --password xxx --client-id xxx --client-secret xxx [--persistPassword]
 *   npx tsx cli/auth.ts list
 *   npx tsx cli/auth.ts status
 *   npx tsx cli/auth.ts revoke --account user@example.com
 */

import { config } from 'dotenv'
config()

import {
  loadCredentials,
  saveCredentials,
  initCredentials,
  setAccount,
  getAccount,
  removeAccount,
  listAccounts,
  getAuthStatus,
  getCredentialsPath,
  getClientId,
  getClientSecret
} from '../src/auth/token-manager.js'
import { performOAuthLogin, revokeToken } from '../src/auth/oauth.js'
import type { StoredAccount } from '../src/types/index.js'

// Parse command line arguments
function parseArgs(): {
  command: string
  username?: string
  password?: string
  clientId?: string
  clientSecret?: string
  account?: string
  persistPassword: boolean
} {
  const args = process.argv.slice(2)
  const result: ReturnType<typeof parseArgs> = {
    command: args[0] ?? 'help',
    persistPassword: false
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--username':
      case '-u':
        result.username = nextArg
        i++
        break
      case '--password':
      case '-p':
        result.password = nextArg
        i++
        break
      case '--client-id':
        result.clientId = nextArg
        i++
        break
      case '--client-secret':
        result.clientSecret = nextArg
        i++
        break
      case '--account':
      case '-a':
        result.account = nextArg
        i++
        break
      case '--persistPassword':
        result.persistPassword = true
        break
    }
  }

  return result
}

function printHelp(): void {
  console.log(`
EEN MCP Server - Auth CLI

Usage:
  npx tsx cli/auth.ts <command> [options]

Commands:
  login     Login and store credentials for an account
  list      List all configured accounts
  status    Show detailed status for all accounts
  revoke    Revoke tokens and remove an account

Options for login:
  --username, -u       EEN account email (required)
  --password, -p       EEN account password (required)
  --client-id          OAuth client ID (or set EEN_CLIENT_ID env var)
  --client-secret      OAuth client secret (or set EEN_CLIENT_SECRET env var)
  --persistPassword    Store password for automatic re-authentication

Options for revoke:
  --account, -a        Account email to revoke (required)

Examples:
  # Login with credentials from environment
  npx tsx cli/auth.ts login -u user@example.com -p mypassword

  # Login with all options
  npx tsx cli/auth.ts login \\
    --username user@example.com \\
    --password mypassword \\
    --client-id my-client-id \\
    --client-secret my-client-secret \\
    --persistPassword

  # List accounts
  npx tsx cli/auth.ts list

  # Show status
  npx tsx cli/auth.ts status

  # Revoke an account
  npx tsx cli/auth.ts revoke --account user@example.com
`)
}

async function login(
  username: string,
  password: string,
  clientId: string,
  clientSecret: string,
  persistPassword: boolean
): Promise<void> {
  console.log(`Logging in as ${username}...`)

  // Initialize or load existing credentials
  const loadResult = loadCredentials()
  if (loadResult.error && loadResult.error.code !== 'AUTH_REQUIRED') {
    console.error('Error loading credentials:', loadResult.error.message)
  }

  // Initialize client credentials
  initCredentials(clientId, clientSecret)

  // Perform OAuth login
  const loginResult = await performOAuthLogin(username, password, clientId, clientSecret)

  if (loginResult.error) {
    console.error('Login failed:', loginResult.error.message)
    process.exit(1)
  }

  const { accessToken, refreshToken, expiresIn, baseUrl, userId, userName } = loginResult.data

  // Store account
  const account: StoredAccount = {
    refreshToken,
    accessToken,
    accessTokenExpiresAt: Date.now() + (expiresIn * 1000),
    baseUrl,
    userId,
    userName,
    createdAt: Date.now(),
    lastRefreshedAt: Date.now()
  }

  setAccount(username, account, persistPassword ? password : undefined)

  // Save credentials
  const saveResult = saveCredentials()
  if (saveResult.error) {
    console.error('Error saving credentials:', saveResult.error.message)
    process.exit(1)
  }

  console.log('')
  console.log('Login successful!')
  console.log(`  Account: ${username}`)
  console.log(`  User ID: ${userId ?? 'N/A'}`)
  console.log(`  User Name: ${userName ?? 'N/A'}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Token expires: ${new Date(account.accessTokenExpiresAt).toISOString()}`)
  console.log(`  Password stored: ${persistPassword ? 'Yes' : 'No'}`)
  console.log('')
  console.log(`Credentials saved to: ${getCredentialsPath()}`)
}

function list(): void {
  const loadResult = loadCredentials()
  if (loadResult.error) {
    if (loadResult.error.code === 'AUTH_REQUIRED') {
      console.log('No accounts configured.')
      console.log('Run: npx tsx cli/auth.ts login --help')
    } else {
      console.error('Error:', loadResult.error.message)
    }
    return
  }

  const accounts = listAccounts()

  if (accounts.length === 0) {
    console.log('No accounts configured.')
    return
  }

  console.log('Configured accounts:')
  console.log('')

  for (const accountId of accounts) {
    const account = getAccount(accountId)
    if (account) {
      const hasPassword = !!account.password
      console.log(`  ${accountId}`)
      console.log(`    Password stored: ${hasPassword ? 'Yes' : 'No'}`)
    }
  }
}

function status(): void {
  const loadResult = loadCredentials()
  if (loadResult.error) {
    if (loadResult.error.code === 'AUTH_REQUIRED') {
      console.log('No accounts configured.')
      console.log('Run: npx tsx cli/auth.ts login --help')
    } else {
      console.error('Error:', loadResult.error.message)
    }
    return
  }

  const authStatus = getAuthStatus()

  if (authStatus.accounts.length === 0) {
    console.log('No accounts configured.')
    return
  }

  console.log('Account Status:')
  console.log('')

  for (const account of authStatus.accounts) {
    const tokenStatus = account.accessTokenValid ? '✓ Valid' : '✗ Expired'
    const expiresAt = new Date(account.accessTokenExpiresAt).toISOString()
    const createdAt = new Date(account.createdAt).toISOString()
    const lastRefreshed = new Date(account.lastRefreshedAt).toISOString()

    console.log(`  ${account.accountId}`)
    console.log(`    Base URL:        ${account.baseUrl}`)
    console.log(`    User ID:         ${account.userId ?? 'N/A'}`)
    console.log(`    User Name:       ${account.userName ?? 'N/A'}`)
    console.log(`    Token Status:    ${tokenStatus}`)
    console.log(`    Token Expires:   ${expiresAt}`)
    console.log(`    Password Stored: ${account.hasPassword ? 'Yes' : 'No'}`)
    console.log(`    Created:         ${createdAt}`)
    console.log(`    Last Refreshed:  ${lastRefreshed}`)
    console.log('')
  }

  console.log(`Credentials file: ${getCredentialsPath()}`)
}

async function revoke(accountId: string): Promise<void> {
  const loadResult = loadCredentials()
  if (loadResult.error) {
    console.error('Error:', loadResult.error.message)
    process.exit(1)
  }

  const account = getAccount(accountId)
  if (!account) {
    console.error(`Account '${accountId}' not found.`)
    process.exit(1)
  }

  const clientId = getClientId()
  const clientSecret = getClientSecret()

  if (!clientId || !clientSecret) {
    console.error('Client credentials not found. Cannot revoke tokens.')
    process.exit(1)
  }

  console.log(`Revoking tokens for ${accountId}...`)

  // Revoke the refresh token
  const revokeResult = await revokeToken(account.refreshToken, clientId, clientSecret)

  if (revokeResult.error) {
    console.warn('Warning: Token revocation failed:', revokeResult.error.message)
    console.log('Removing local credentials anyway...')
  } else {
    console.log('Tokens revoked successfully.')
  }

  // Remove account from local storage
  removeAccount(accountId)

  // Save credentials
  const saveResult = saveCredentials()
  if (saveResult.error) {
    console.error('Error saving credentials:', saveResult.error.message)
    process.exit(1)
  }

  console.log(`Account '${accountId}' removed.`)
}

async function main(): Promise<void> {
  const args = parseArgs()

  switch (args.command) {
    case 'login': {
      const username = args.username
      const password = args.password
      const clientId = args.clientId ?? process.env.EEN_CLIENT_ID
      const clientSecret = args.clientSecret ?? process.env.EEN_CLIENT_SECRET

      if (!username) {
        console.error('Error: --username is required')
        process.exit(1)
      }
      if (!password) {
        console.error('Error: --password is required')
        process.exit(1)
      }
      if (!clientId) {
        console.error('Error: --client-id is required (or set EEN_CLIENT_ID env var)')
        process.exit(1)
      }
      if (!clientSecret) {
        console.error('Error: --client-secret is required (or set EEN_CLIENT_SECRET env var)')
        process.exit(1)
      }

      await login(username, password, clientId, clientSecret, args.persistPassword)
      break
    }

    case 'list':
      list()
      break

    case 'status':
      status()
      break

    case 'revoke': {
      const accountId = args.account
      if (!accountId) {
        console.error('Error: --account is required')
        process.exit(1)
      }
      await revoke(accountId)
      break
    }

    case 'help':
    default:
      printHelp()
      break
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
