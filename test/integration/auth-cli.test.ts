/**
 * Integration Tests for Auth CLI
 *
 * These tests verify the authentication CLI works correctly.
 * Note: These tests use the already-configured test account.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { config } from 'dotenv'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Load environment variables
config()

const CLI_PATH = path.join(process.cwd(), 'cli', 'auth.ts')
const CREDENTIALS_PATH = path.join(os.homedir(), '.een-mcp', 'credentials.json')

/**
 * Run the auth CLI command and return output
 */
function runCli(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx ${CLI_PATH} ${args}`, {
      encoding: 'utf-8',
      timeout: 60000,
      env: { ...process.env }
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number }
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.status ?? 1
    }
  }
}

describe('Auth CLI Integration Tests', () => {
  beforeAll(() => {
    // Verify credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(`Credentials file not found at ${CREDENTIALS_PATH}. Run 'npx tsx cli/auth.ts login' first.`)
    }
  })

  describe('help command', () => {
    it('should display help information', () => {
      const result = runCli('help')

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('EEN MCP Server - Auth CLI')
      expect(result.stdout).toContain('Commands:')
      expect(result.stdout).toContain('login')
      expect(result.stdout).toContain('list')
      expect(result.stdout).toContain('status')
      expect(result.stdout).toContain('revoke')
    })

    it('should display help for unknown commands', () => {
      const result = runCli('unknown')

      expect(result.stdout).toContain('EEN MCP Server - Auth CLI')
    })
  })

  describe('list command', () => {
    it('should list configured accounts', () => {
      const result = runCli('list')

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Configured accounts:')
      // Should show at least one account
      expect(result.stdout).toMatch(/@/)
    })

    it('should show password stored status', () => {
      const result = runCli('list')

      expect(result.stdout).toContain('Password stored:')
    })
  })

  describe('status command', () => {
    it('should show account status', () => {
      const result = runCli('status')

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Account Status:')
    })

    it('should show base URL', () => {
      const result = runCli('status')

      expect(result.stdout).toContain('Base URL:')
      expect(result.stdout).toContain('eagleeyenetworks.com')
    })

    it('should show token status', () => {
      const result = runCli('status')

      expect(result.stdout).toContain('Token Status:')
      // Token should be valid (we just logged in)
      expect(result.stdout).toContain('Valid')
    })

    it('should show token expiration', () => {
      const result = runCli('status')

      expect(result.stdout).toContain('Token Expires:')
      // Should be an ISO date format
      expect(result.stdout).toMatch(/\d{4}-\d{2}-\d{2}T/)
    })

    it('should show user information', () => {
      const result = runCli('status')

      expect(result.stdout).toContain('User ID:')
      expect(result.stdout).toContain('User Name:')
    })

    it('should show credentials file path', () => {
      const result = runCli('status')

      expect(result.stdout).toContain('Credentials file:')
      expect(result.stdout).toContain('.een-mcp')
    })
  })

  describe('credentials file', () => {
    it('should exist and be valid JSON', () => {
      expect(fs.existsSync(CREDENTIALS_PATH)).toBe(true)

      const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8')
      const credentials = JSON.parse(content)

      expect(credentials).toBeDefined()
      expect(credentials.accounts).toBeDefined()
      expect(typeof credentials.accounts).toBe('object')
    })

    it('should have restricted file permissions', () => {
      if (process.platform === 'win32') {
        console.log('Skipping permissions check on Windows')
        return
      }

      const stats = fs.statSync(CREDENTIALS_PATH)
      const mode = stats.mode & 0o777

      // Should be 0600 (owner read/write only)
      expect(mode).toBe(0o600)
    })

    it('should have at least one account', () => {
      const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8')
      const credentials = JSON.parse(content)

      const accountCount = Object.keys(credentials.accounts).length
      expect(accountCount).toBeGreaterThan(0)
    })

    it('should have required account fields', () => {
      const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8')
      const credentials = JSON.parse(content)

      const accountId = Object.keys(credentials.accounts)[0]!
      const account = credentials.accounts[accountId]

      expect(account.refreshToken).toBeDefined()
      expect(account.accessToken).toBeDefined()
      expect(account.accessTokenExpiresAt).toBeDefined()
      expect(account.baseUrl).toBeDefined()
      expect(account.createdAt).toBeDefined()
      expect(account.lastRefreshedAt).toBeDefined()
    })

    it('should have client credentials', () => {
      const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8')
      const credentials = JSON.parse(content)

      expect(credentials.clientId).toBeDefined()
      expect(credentials.clientSecret).toBeDefined()
    })
  })

  describe('revoke command validation', () => {
    it('should require --account parameter', () => {
      const result = runCli('revoke')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('--account is required')
    })

    it('should fail for non-existent account', () => {
      const result = runCli('revoke --account nonexistent@example.com')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not found')
    })
  })

  describe('login command validation', () => {
    it('should require --username parameter', () => {
      const result = runCli('login --password test')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('--username is required')
    })

    it('should require --password parameter', () => {
      const result = runCli('login --username test@example.com')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('--password is required')
    })

    it('should require client credentials', () => {
      // Clear EEN_CLIENT_ID to test this
      const env = { ...process.env }
      delete env.EEN_CLIENT_ID
      delete env.EEN_CLIENT_SECRET

      try {
        execSync(`npx tsx ${CLI_PATH} login --username test@example.com --password test`, {
          encoding: 'utf-8',
          timeout: 10000,
          env
        })
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        const err = error as { stderr?: string }
        expect(err.stderr).toContain('--client-id is required')
      }
    })
  })
})
