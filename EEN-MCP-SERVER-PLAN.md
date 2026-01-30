# EEN MCP Server Implementation Plan

## Overview

This document outlines the implementation plan for an **MCP (Model Context Protocol) server** that provides AI assistants with access to Eagle Eye Networks (EEN) camera systems. The server enables querying cameras, fetching live/recorded images, accessing events, and managing users.

### Design Principles

1. **No external proxy dependency** - Token management is local to the server
2. **Multi-user support** - Credentials stored per account name
3. **No Vue/Pinia dependencies** - Direct REST API calls using fetch
4. **Headless authentication** - Playwright-based OAuth automation
5. **Modular architecture** - Independent components for parallel development

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           EEN MCP Server                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │  MCP Interface  │    │   API Client    │    │  Token Manager  │     │
│  │                 │    │                 │    │                 │     │
│  │  - Tool defs    │───▶│  - Cameras      │◀───│  - Multi-user   │     │
│  │  - Handlers     │    │  - Events       │    │  - Auto-refresh │     │
│  │  - Resources    │    │  - Users        │    │  - File storage │     │
│  └─────────────────┘    │  - Media        │    └────────┬────────┘     │
│                         │  - Alerts       │             │              │
│                         └─────────────────┘             │              │
│                                                         │              │
├─────────────────────────────────────────────────────────┼──────────────┤
│                                                         │              │
│  ┌─────────────────────────────────────────────────────▼────────┐      │
│  │                    Auth CLI (Playwright)                      │     │
│  │                                                               │     │
│  │  Separate script/service for headless OAuth authentication    │     │
│  │  Input: username, password, client_id                         │     │
│  │  Output: refresh_token, access_token, base_url, user_id       │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

                              │
                              ▼
              ┌───────────────────────────────┐
              │   ~/.een-mcp/credentials.json │
              │                               │
              │   {                           │
              │     "accounts": {             │
              │       "user@example.com": {   │
              │         "refreshToken": "...",│
              │         "accessToken": "...", │
              │         "baseUrl": "...",     │
              │         "password": "..."     │
              │       }                       │
              │     },                        │
              │     "clientId": "...",        │
              │     "clientSecret": "..."     │
              │   }                           │
              └───────────────────────────────┘
```

---

## Authentication Strategy

### Design Decision: Pre-Authentication via CLI

**Important:** Authentication is performed separately from the MCP server using a command-line tool. Users must authenticate accounts *before* using the MCP server through Claude or other AI assistants.

This design ensures:
- Passwords never flow through AI assistant conversations
- Clear separation between credential management and API usage
- Users maintain full control over which accounts are configured

### Two-Phase Authentication

#### Phase 1: Credential Acquisition (Auth CLI)

A separate Playwright-based script that performs headless OAuth. Users run this CLI tool directly in their terminal.

**CLI Commands:**

```bash
# Login and store credentials for an account
npx tsx cli/auth.ts login \
  --username user@example.com \
  --password "your-password" \
  --client-id "your-client-id" \
  --client-secret "your-client-secret" \
  [--persistPassword]                    # Optional: store password for auto-reauth

# List all configured accounts
npx tsx cli/auth.ts list

# Show detailed status for all accounts
npx tsx cli/auth.ts status

# Revoke tokens and remove account
npx tsx cli/auth.ts revoke --account user@example.com
```

**CLI Options:**

| Option | Description |
|--------|-------------|
| `--username` | EEN account email (required for login) |
| `--password` | EEN account password (required for login) |
| `--client-id` | OAuth client ID (required, or set via `EEN_CLIENT_ID` env var) |
| `--client-secret` | OAuth client secret (required, or set via `EEN_CLIENT_SECRET` env var) |
| `--persistPassword` | Store password locally for automatic re-authentication when refresh token expires |
| `--account` | Account identifier for revoke command |

**Login Process:**
1. Launch headless Chromium browser via Playwright
2. Navigate to EEN OAuth authorization URL
3. Automate login form (email → Next → password → Sign in)
4. Capture redirect URL containing authorization code
5. Exchange code directly with EEN token endpoint for tokens
6. Store credentials in `~/.een-mcp/credentials.json`
7. Optionally store password if `--persistPassword` is specified

**Login Output:**
```typescript
{
  accountId: string      // User email (used as key)
  accessToken: string    // Short-lived access token
  refreshToken: string   // Long-lived refresh token
  expiresIn: number      // Token validity in seconds
  baseUrl: string        // Regional API endpoint (e.g., https://c001.eagleeyenetworks.com)
  userId?: string        // EEN user ID
  userName?: string      // User display name
}
```

**Revoke Process:**
1. Call EEN token revocation endpoint to invalidate refresh token
2. Remove account entry from local credentials file
3. Clear any stored password for the account

**Key Difference from Existing Implementation:**
The existing `auth-helper.ts` uses the OAuth proxy for token exchange. Our implementation calls the EEN token endpoint directly:

```
POST https://auth.eagleeyenetworks.com/oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=authorization_code&code={code}&redirect_uri={redirect_uri}
```

#### Phase 2: MCP Server Runtime

The server loads stored credentials and manages token lifecycle:

1. On startup, load credentials from `~/.een-mcp/credentials.json`
2. No account is active initially - user must call `een_set_account` to select one
3. API calls require an active account (return error if none selected)
4. Check token expiration before each API call
5. Auto-refresh using refresh token when access token expires
6. If refresh fails and password is stored, attempt full re-authentication
7. If refresh fails and no password stored, return auth error to user
8. Update stored credentials after successful refresh or re-auth

### Token Storage Format

```json
{
  "accounts": {
    "user@example.com": {
      "refreshToken": "eyJ...",
      "accessToken": "eyJ...",
      "accessTokenExpiresAt": 1705680000000,
      "baseUrl": "https://c001.eagleeyenetworks.com",
      "userId": "abc123",
      "userName": "John Doe",
      "createdAt": 1705593600000,
      "lastRefreshedAt": 1705676400000,
      "password": "encrypted-password-if-persisted"
    }
  },
  "clientId": "your-client-id",
  "clientSecret": "encrypted-client-secret"
}
```

**Note:** There is no default account. Users must explicitly select an account using `een_set_account` before making API calls. This ensures users are always aware of which account they're operating with.

**Security:**
- File permissions: `0o600` (owner read/write only)
- Location: `~/.een-mcp/credentials.json`
- Added to `.gitignore`
- Passwords encrypted at rest using machine-specific key
- Client credentials stored once, reused for all accounts

---

## Direct API Integration

### HTTP Client Design

All API calls use native `fetch()` with Bearer token authentication:

```typescript
async function eenFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<Result<T>> {
  const account = getActiveAccount()

  // Auto-refresh if needed
  if (isTokenExpired(account)) {
    const refreshResult = await refreshAccessToken(account)
    if (refreshResult.error) return refreshResult
  }

  const response = await fetch(`${account.baseUrl}/api/v3.0${endpoint}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${account.accessToken}`,
      ...options.headers
    }
  })

  if (!response.ok) {
    return { data: null, error: parseError(response) }
  }

  return { data: await response.json(), error: null }
}
```

### Token Refresh Implementation

```typescript
async function refreshAccessToken(account: Account): Promise<Result<void>> {
  const response = await fetch('https://auth.eagleeyenetworks.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${base64(CLIENT_ID + ':' + CLIENT_SECRET)}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refreshToken
    })
  })

  if (!response.ok) {
    return { data: null, error: { code: 'AUTH_FAILED', message: 'Token refresh failed' } }
  }

  const data = await response.json()

  // Update stored credentials
  account.accessToken = data.access_token
  account.accessTokenExpiresAt = Date.now() + (data.expires_in * 1000)
  if (data.refresh_token) {
    account.refreshToken = data.refresh_token  // Token rotation
  }
  account.lastRefreshedAt = Date.now()

  await saveCredentials()
  return { data: undefined, error: null }
}
```

---

## MCP Tools Specification

### Authentication Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `een_auth_status` | Check authentication status for all accounts | none |
| `een_set_account` | Set active account for subsequent calls | `accountId: string` |
| `een_list_accounts` | List all configured accounts | none |

### Camera Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `een_get_cameras` | List cameras with pagination | `pageSize?: number`, `pageToken?: string`, `status?: string[]` |
| `een_get_camera` | Get single camera details | `cameraId: string`, `include?: string[]` |

### Media Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `een_get_live_image` | Get current camera snapshot (base64) | `deviceId: string` |
| `een_get_recorded_image` | Get historical image | `deviceId: string`, `timestamp: string`, `type?: 'preview'\|'main'` |
| `een_list_media` | List recording intervals | `deviceId: string`, `startTimestamp: string`, `endTimestamp: string` |

### Event Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `een_get_events` | Query events with filters | `actor: string`, `types: string[]`, `startTimestamp: string`, `endTimestamp?: string` |
| `een_get_event_types` | List available event types | `pageSize?: number` |

### User Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `een_get_current_user` | Get authenticated user profile | none |
| `een_get_users` | List users with pagination | `pageSize?: number`, `pageToken?: string` |
| `een_get_user` | Get specific user | `userId: string` |

### Alert Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `een_get_alerts` | List system alerts | `actorId?: string[]`, `startTimestamp?: string`, `pageSize?: number` |

### Bridge Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `een_get_bridges` | List bridge devices | `pageSize?: number`, `status?: string[]` |
| `een_get_bridge` | Get bridge details | `bridgeId: string` |

---

## Development Tasks

The following tasks are designed to be executed by independent agents in parallel where possible.

### Task 1: Project Scaffolding

**Agent Type:** General-purpose

**Objective:** Set up the Node.js/TypeScript project structure

**Deliverables:**
- `package.json` with dependencies:
  - `@modelcontextprotocol/sdk`
  - `playwright` (dev dependency for auth CLI)
  - `typescript`
  - `tsx` (for running TS directly)
- `tsconfig.json` with strict mode
- Directory structure:
  ```
  een-mcp-server/
  ├── src/
  │   ├── index.ts
  │   ├── types/
  │   ├── auth/
  │   ├── api/
  │   └── tools/
  ├── cli/
  │   └── auth.ts
  ├── package.json
  └── tsconfig.json
  ```
- Basic MCP server skeleton that starts and accepts connections

**Dependencies:** None

---

### Task 2: Type Definitions

**Agent Type:** General-purpose

**Objective:** Define TypeScript interfaces for all data structures

**Deliverables:**
- `src/types/auth.ts` - AuthState, TokenResponse, CredentialsFile
- `src/types/api.ts` - Camera, Event, User, Alert, Bridge, etc.
- `src/types/result.ts` - Result<T> type and error codes
- `src/types/tools.ts` - Tool parameter and response types

**Reference:** Use types from `een-api-toolkit/src/types/` as reference

**Dependencies:** Task 1

---

### Task 3: Auth CLI with Playwright

**Agent Type:** General-purpose

**Objective:** Implement headless OAuth authentication script with password persistence and revocation

**Deliverables:**
- `cli/auth.ts` - Main authentication script
- Command-line interface:
  ```bash
  # Login with optional password persistence
  npx tsx cli/auth.ts login \
    --username user@example.com \
    --password xxx \
    --client-id xxx \
    --client-secret xxx \
    [--persistPassword]

  # List configured accounts
  npx tsx cli/auth.ts list

  # Show detailed account status
  npx tsx cli/auth.ts status

  # Revoke tokens and remove account
  npx tsx cli/auth.ts revoke --account user@example.com
  ```

**Features:**
- `login` command:
  - Performs Playwright-based headless OAuth flow
  - Exchanges authorization code directly with EEN token endpoint
  - Stores tokens in `~/.een-mcp/credentials.json`
  - `--persistPassword` flag encrypts and stores password for auto-reauth
  - Stores client ID/secret for reuse across accounts

- `list` command:
  - Shows all configured accounts
  - Shows if password is persisted for each account

- `status` command:
  - Shows token expiration times
  - Indicates if refresh token is still valid
  - Shows last successful authentication time

- `revoke` command:
  - Calls EEN revocation endpoint: `POST https://auth.eagleeyenetworks.com/oauth2/revoke`
  - Removes account entry from credentials file
  - Clears stored password if present

**Security:**
- Password encryption using machine-specific key (e.g., via `crypto` module with machine ID)
- Never log passwords or tokens to console
- Validate credentials file permissions on read/write

**Reference:**
- `een-api-toolkit/e2e/auth-helper.ts` for Playwright flow
- Direct token exchange with EEN (not via proxy)

**Dependencies:** Task 1, Task 2

---

### Task 4: Token Manager

**Agent Type:** General-purpose

**Objective:** Implement credential storage, token refresh, and automatic re-authentication

**Deliverables:**
- `src/auth/token-manager.ts`:
  - `loadCredentials()` - Read from file, validate permissions
  - `saveCredentials()` - Write to file with `0o600` permissions
  - `getAccount(accountId)` - Get specific account by ID
  - `listAccounts()` - List all configured account IDs
  - `getActiveAccount()` - Get currently selected account (null if none)
  - `setActiveAccount(accountId)` - Select account for API calls (validates account exists)
  - `requireActiveAccount()` - Get active account or throw error if none selected
  - `isTokenExpired(account)` - Check expiration with 5-minute buffer
  - `refreshAccessToken(account)` - Refresh using refresh token
  - `reAuthenticate(account)` - Full OAuth flow using stored password (requires Playwright)
  - `ensureValidToken(account)` - Main entry point: refresh → reauth → error

- `src/auth/crypto.ts`:
  - `encryptPassword(password)` - Encrypt using machine-specific key
  - `decryptPassword(encrypted)` - Decrypt stored password
  - Machine ID derivation for encryption key

**Token Refresh Flow:**
```
ensureValidToken(account)
    │
    ├─► Token valid? → Return success
    │
    ├─► Try refreshAccessToken()
    │       │
    │       ├─► Success → Update storage, return success
    │       │
    │       └─► Failure (refresh token expired/revoked)
    │               │
    │               ├─► Password stored? → reAuthenticate()
    │               │       │
    │               │       ├─► Success → Update all tokens, return success
    │               │       │
    │               │       └─► Failure → Return AUTH_FAILED error
    │               │
    │               └─► No password → Return AUTH_EXPIRED error
    │                   (User must run CLI to re-authenticate)
```

**Re-authentication Notes:**
- `reAuthenticate()` imports Playwright dynamically (lazy load)
- Reuses the same OAuth flow as Auth CLI
- Updates all stored credentials on success
- Logs re-authentication events (without sensitive data)

**Dependencies:** Task 1, Task 2

---

### Task 5: API Client - Core

**Agent Type:** General-purpose

**Objective:** Implement base HTTP client for EEN API

**Deliverables:**
- `src/api/client.ts`:
  - `eenFetch<T>(endpoint, options)` - Base fetch with auth
  - Error handling and Result<T> wrapping
  - Pagination helper
  - Request timeout handling (30s for media)
- `src/api/endpoints.ts` - API endpoint constants

**Reference:** `een-api-toolkit/src/services/` for endpoint patterns

**Dependencies:** Task 2, Task 4

---

### Task 6: API Client - Cameras & Bridges

**Agent Type:** General-purpose

**Objective:** Implement camera and bridge API functions

**Deliverables:**
- `src/api/cameras.ts`:
  - `getCameras(params)`
  - `getCamera(cameraId, params)`
- `src/api/bridges.ts`:
  - `getBridges(params)`
  - `getBridge(bridgeId, params)`

**Dependencies:** Task 5

---

### Task 7: API Client - Media

**Agent Type:** General-purpose

**Objective:** Implement media/image API functions

**Deliverables:**
- `src/api/media.ts`:
  - `getLiveImage(deviceId)` - Returns base64 JPEG
  - `getRecordedImage(params)` - Historical image
  - `listMedia(params)` - Recording intervals
- Handle binary response → base64 conversion
- Chunked base64 encoding to avoid stack overflow

**Reference:** `een-api-toolkit/src/services/media.ts`

**Dependencies:** Task 5

---

### Task 8: API Client - Events & Alerts

**Agent Type:** General-purpose

**Objective:** Implement events and alerts API functions

**Deliverables:**
- `src/api/events.ts`:
  - `listEvents(params)` - Query events (requires actor, types, startTimestamp)
  - `listEventTypes(params)`
- `src/api/alerts.ts`:
  - `listAlerts(params)`
  - `getAlert(alertId, params)`

**Dependencies:** Task 5

---

### Task 9: API Client - Users

**Agent Type:** General-purpose

**Objective:** Implement user management API functions

**Deliverables:**
- `src/api/users.ts`:
  - `getCurrentUser()`
  - `getUsers(params)`
  - `getUser(userId, params)`

**Dependencies:** Task 5

---

### Task 10: MCP Tool Handlers

**Agent Type:** General-purpose

**Objective:** Implement MCP tool definitions and handlers

**Deliverables:**
- `src/tools/definitions.ts` - Tool schemas (JSON Schema format)
- `src/tools/handlers.ts` - Tool execution logic
- `src/tools/index.ts` - Tool registration with MCP server
- Map each tool to corresponding API function
- Handle errors and return structured responses

**Dependencies:** Tasks 6, 7, 8, 9

---

### Task 11: MCP Server Integration

**Agent Type:** General-purpose

**Objective:** Wire everything together into working MCP server

**Deliverables:**
- `src/index.ts` - Main entry point:
  - Initialize MCP server with stdio transport
  - Register all tools
  - Handle tool calls
  - Graceful shutdown
- Configuration via environment variables or config file
- Startup validation (check credentials exist)

**Dependencies:** Task 4, Task 10

---

### Task 12: Testing

**Agent Type:** General-purpose

**Objective:** Create comprehensive test suite with both mock tests and live integration tests

**Test Environment Setup:**
```bash
# .env file for testing
TEST_USER=test@example.com          # Valid EEN account for live tests
TEST_PASSWORD=your-test-password    # Password for test account
EEN_CLIENT_ID=your-client-id
EEN_CLIENT_SECRET=your-client-secret
```

**Deliverables:**

**Unit Tests (Mock):**
- `test/unit/token-manager.test.ts` - Token storage, expiration checks, credential file handling
- `test/unit/api-client.test.ts` - HTTP client with mocked responses, error handling
- `test/unit/tools.test.ts` - Tool parameter validation, response formatting
- `test/unit/crypto.test.ts` - Password encryption/decryption

**Integration Tests (Live Service):**
- `test/integration/auth-cli.test.ts` - Auth CLI against live EEN OAuth:
  - `login` command with valid credentials
  - `login` command with `--persistPassword`
  - `list` command shows authenticated account
  - `status` command shows valid tokens
  - `revoke` command invalidates tokens
  - Error handling for invalid credentials

- `test/integration/tools.test.ts` - MCP tools against live EEN API:
  - `een_list_accounts` - Lists test account
  - `een_set_account` - Selects test account
  - `een_auth_status` - Shows authenticated status
  - `een_get_cameras` - Returns camera list
  - `een_get_camera` - Returns single camera details
  - `een_get_live_image` - Returns base64 image data
  - `een_get_bridges` - Returns bridge list
  - `een_get_users` - Returns user list
  - `een_get_current_user` - Returns authenticated user
  - `een_get_events` - Returns events (if available)
  - `een_get_alerts` - Returns alerts (if available)

**Test Utilities:**
- `test/helpers/setup.ts` - Test environment setup, credential loading
- `test/helpers/cleanup.ts` - Remove test credentials after tests
- `test/fixtures/` - Mock response data for unit tests

**Test Scripts:**
```bash
# Run all tests
npm test

# Run only unit tests (no network)
npm run test:unit

# Run only integration tests (requires .env)
npm run test:integration

# Run specific test file
npm run test -- test/integration/auth-cli.test.ts
```

**Integration Test Notes:**
- Tests require valid `.env` file with TEST_USER and TEST_PASSWORD
- Tests authenticate once and reuse credentials where possible
- Tests clean up created resources (revoke tokens after auth tests)
- Tests skip gracefully if credentials not available
- Tests handle rate limiting with appropriate delays

**Dependencies:** All previous tasks

---

### Task 13: Documentation

**Agent Type:** General-purpose

**Objective:** Create user documentation

**Deliverables:**
- `README.md`:
  - Installation instructions
  - Auth CLI usage
  - MCP server configuration
  - Available tools reference
  - Troubleshooting guide
- `DEVELOPMENT.md` - Developer guide

**Dependencies:** All previous tasks

---

## Task Dependency Graph

```
Task 1 (Scaffolding)
    │
    ▼
Task 2 (Types)
    │
    ├──────────────────┬─────────────────┐
    ▼                  ▼                 ▼
Task 3 (Auth CLI)  Task 4 (Token Mgr)
    │                  │
    │                  ▼
    │              Task 5 (API Core)
    │                  │
    │     ┌────────────┼────────────┬────────────┐
    │     ▼            ▼            ▼            ▼
    │  Task 6       Task 7       Task 8       Task 9
    │  (Cameras)    (Media)      (Events)     (Users)
    │     │            │            │            │
    │     └────────────┴────────────┴────────────┘
    │                       │
    │                       ▼
    │                  Task 10 (Tool Handlers)
    │                       │
    └───────────────────────┤
                            ▼
                       Task 11 (Integration)
                            │
                            ▼
                       Task 12 (Testing)
                            │
                            ▼
                       Task 13 (Documentation)
```

### Parallel Execution Groups

**Group A (can run in parallel after Task 2):**
- Task 3: Auth CLI
- Task 4: Token Manager

**Group B (can run in parallel after Task 5):**
- Task 6: Cameras & Bridges API
- Task 7: Media API
- Task 8: Events & Alerts API
- Task 9: Users API

---

## Configuration

### Environment Variables

```bash
# Required for Auth CLI and MCP Server
EEN_CLIENT_ID=your-client-id
EEN_CLIENT_SECRET=your-client-secret

# Optional
EEN_CREDENTIALS_PATH=~/.een-mcp/credentials.json
EEN_DEBUG=true

# Required for Integration Tests
TEST_USER=test@example.com
TEST_PASSWORD=your-test-password
```

### MCP Client Configuration (Claude Desktop)

```json
{
  "mcpServers": {
    "een": {
      "command": "npx",
      "args": ["tsx", "/path/to/een-mcp-server/src/index.ts"],
      "env": {
        "EEN_CLIENT_ID": "your-client-id",
        "EEN_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

---

## Security Considerations

1. **Credential Storage**
   - All credentials stored in `~/.een-mcp/credentials.json` with `0o600` permissions
   - Refresh tokens stored in plaintext (standard practice for local credential files)
   - Never logged or exposed via MCP responses
   - Client ID/secret stored once, reused for all accounts

2. **Password Persistence (`--persistPassword`)**
   - Passwords encrypted at rest using machine-specific key
   - Encryption key derived from machine ID (hardware identifier)
   - Enables automatic re-authentication when refresh token expires
   - **Trade-off:** Convenience vs. security - users should understand the risk
   - Without `--persistPassword`: User must manually re-run CLI when refresh token expires
   - With `--persistPassword`: MCP server can silently re-authenticate

3. **Token Lifecycle**
   - Access tokens auto-refresh 5 minutes before expiration
   - Refresh tokens rotated when EEN returns new one
   - Failed refresh triggers re-authentication (if password stored) or error

4. **Token Revocation**
   - `revoke` command calls EEN revocation endpoint
   - Removes all local data for the account (tokens + password)
   - Ensures tokens cannot be reused after user explicitly revokes

5. **Input Validation**
   - All tool parameters validated before API calls
   - Pagination limits enforced
   - Timestamps validated for format

6. **Error Handling**
   - Auth errors return `AUTH_EXPIRED` (no password) or `AUTH_FAILED` (reauth failed)
   - API errors returned as structured Result types
   - No stack traces or sensitive data exposed to MCP clients

7. **MCP Server Isolation**
   - Passwords never flow through MCP protocol or AI conversations
   - Users authenticate via CLI separately from MCP usage
   - MCP tools only read pre-existing credentials

---

## References

- **OAuth Proxy Implementation:** `../../een-oauth-proxy/proxy/src/index.js`
- **API Toolkit:** `../../een-api-toolkit/src/services/`
- **Playwright Auth Helper:** `../../een-api-toolkit/e2e/auth-helper.ts`
- **EEN API Documentation:** https://developer.eagleeyenetworks.com/
