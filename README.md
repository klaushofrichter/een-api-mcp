# EEN MCP Server

Model Context Protocol (MCP) server for Eagle Eye Networks camera systems. This server enables AI assistants like Claude to interact with EEN cameras, view live/recorded images, query events, manage layouts, and more.

## Features

- **Camera Management**: List cameras, view camera details, filter by status
- **Live & Recorded Images**: Get current snapshots or historical footage
- **Layout Management**: View and query camera layouts (predefined grid views)
- **Event Querying**: Query motion events, analytics events, and 60+ event types
- **User Management**: View users and current user profile
- **Alert Access**: Query triggered alerts and notifications
- **Bridge Information**: View bridge devices and their connection status
- **Multi-Account Support**: Configure and switch between multiple EEN accounts
- **Automatic Token Refresh**: Tokens are refreshed automatically before expiration

## Prerequisites

- Node.js 18.0 or later
- An Eagle Eye Networks account
- OAuth client credentials (client ID and secret) from EEN Developer Portal

## Installation

```bash
# Clone the repository
git clone https://github.com/klaushofrichter/een-api-mcp.git
cd een-api-mcp

# Install dependencies
npm install

# Install Playwright browsers (required for OAuth authentication)
npx playwright install chromium

# Build the project
npm run build
```

## Authentication

The MCP server requires pre-authentication before use. Authentication is handled via a CLI tool that performs OAuth login through a headless browser.

### Setting Up Environment Variables

Create a `.env` file in the project root with your OAuth client credentials:

```bash
EEN_CLIENT_ID=your-client-id
EEN_CLIENT_SECRET=your-client-secret
```

You can obtain these credentials from the [Eagle Eye Networks Developer Portal](https://developer.eagleeyenetworks.com/).

### Login Process

The authentication CLI uses Playwright to automate the OAuth login flow:

```bash
# Basic login (will prompt for password if not provided)
npm run auth login -- --username user@example.com

# Login with password on command line
npm run auth login -- --username user@example.com --password "your-password"

# Login and store password for automatic re-authentication
npm run auth login -- \
  --username user@example.com \
  --password "your-password" \
  --persistPassword

# Provide OAuth credentials explicitly (overrides .env)
npm run auth login -- \
  --username user@example.com \
  --password "your-password" \
  --client-id your-client-id \
  --client-secret your-client-secret \
  --persistPassword
```

**Important flags:**
- `--persistPassword`: Encrypts and stores your password locally, enabling automatic re-authentication when tokens expire
- `--client-id` / `--client-secret`: Override environment variables for OAuth credentials

### Verifying Authentication

```bash
# List all configured accounts
npm run auth list

# Show detailed status including token expiration
npm run auth status
```

Example status output:
```
Account: user@example.com
  User: John Doe
  Base URL: https://api.c001.eagleeyenetworks.com:443
  Token Valid: true
  Expires: 2026-01-28T22:48:44.000Z
  Password Stored: true
```

### Managing Multiple Accounts

You can configure multiple EEN accounts and switch between them:

```bash
# Login to additional accounts
npm run auth login -- --username another@example.com --persistPassword

# List all accounts
npm run auth list

# Revoke and remove an account
npm run auth revoke -- --account user@example.com
```

### Credential Storage

Credentials are stored securely:
- **Location**: `~/.een-mcp/credentials.json`
- **Permissions**: File is created with `0600` (owner read/write only)
- **Password Encryption**: Passwords are encrypted using AES-256-GCM with a machine-specific key
- **Token Management**: Access tokens are automatically refreshed 5 minutes before expiration

## Configuring Claude

The MCP server can be used with Claude Desktop or Claude Code.

### Claude Desktop Configuration

Add the MCP server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Using the built version (recommended for production):

```json
{
  "mcpServers": {
    "een-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/een-api-mcp/dist/src/index.js"],
      "env": {
        "EEN_CLIENT_ID": "your-client-id",
        "EEN_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Using TypeScript directly (for development):

```json
{
  "mcpServers": {
    "een-mcp-server": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/een-api-mcp/src/index.ts"],
      "env": {
        "EEN_CLIENT_ID": "your-client-id",
        "EEN_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

After updating the configuration, restart Claude Desktop.

### Claude Code Configuration

For Claude Code, add the MCP server to your settings file:

**Global settings**: `~/.claude/settings.json`
**Project settings**: `.mcp.json` in the project root

```json
{
  "mcpServers": {
    "een-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/een-api-mcp/dist/src/index.js"]
    }
  }
}
```

A template configuration file is provided: `mcp-config-template.json`

### Verifying the Connection

After configuration, you can verify the MCP server is connected by asking Claude:

> "What EEN accounts do I have configured?"

Claude should use the `een_list_accounts` tool and return your configured accounts.

## Available Tools

### Authentication Tools (3)

| Tool | Description |
|------|-------------|
| `een_auth_status` | Check authentication status for all configured accounts |
| `een_list_accounts` | List all configured account IDs |
| `een_set_account` | Set the active account for subsequent API calls |

### Camera Tools (2)

| Tool | Description |
|------|-------------|
| `een_get_cameras` | List cameras with pagination, filtering by status, and name search |
| `een_get_camera` | Get detailed information for a specific camera |

### Media Tools (3)

| Tool | Description |
|------|-------------|
| `een_get_live_image` | Get a current live snapshot from a camera (returns base64 JPEG) |
| `een_get_recorded_image` | Get a historical image at a specific timestamp |
| `een_list_media` | List recording intervals (time periods with available recordings) |

### Event Tools (2)

| Tool | Description |
|------|-------------|
| `een_get_events` | Query events with filters for actor, type, and time range |
| `een_get_event_types` | List all 60+ available event types |

### User Tools (3)

| Tool | Description |
|------|-------------|
| `een_get_current_user` | Get the authenticated user's profile |
| `een_get_users` | List all users in the account |
| `een_get_user` | Get details for a specific user |

### Alert Tools (1)

| Tool | Description |
|------|-------------|
| `een_get_alerts` | List triggered alerts with filters for time, actor, and type |

### Bridge Tools (2)

| Tool | Description |
|------|-------------|
| `een_get_bridges` | List bridge devices with optional status filtering |
| `een_get_bridge` | Get detailed information for a specific bridge |

### Layout Tools (2)

| Tool | Description |
|------|-------------|
| `een_get_layouts` | List camera layouts (predefined grid views) |
| `een_get_layout` | Get layout details including camera panes and display settings |

## Usage Examples

Once configured, you can interact with your EEN cameras through natural language:

**Authentication:**
- "What EEN accounts do I have configured?"
- "Show me my authentication status"

**Cameras:**
- "List all my cameras"
- "Show me all online cameras"
- "Which cameras are currently offline?"
- "How many cameras do I have?"

**Live Images:**
- "Take a snapshot from the front door camera"
- "Show me a live image from camera 1005963a"

**Recorded Footage:**
- "Show me footage from the lobby camera at 3pm yesterday"
- "Get a recorded image from an hour ago"

**Events:**
- "What types of events can I query for?"
- "Were there any motion events on the first camera in the last hour?"

**Alerts:**
- "Show me recent alerts"
- "What alerts were triggered today?"

**Bridges:**
- "List all my bridges"
- "Are any of my bridges offline?"

**Users:**
- "Who am I logged in as?"
- "List all users in my EEN account"

**Layouts:**
- "List all my camera layouts"
- "Show me the details of the Klaus Layout"
- "Which cameras are in my layouts?"

**Combined Queries:**
- "Give me a status overview of all my cameras, bridges, and layouts"

## Testing

### Integration Tests

The project includes comprehensive integration tests that run against the live EEN API. These tests require a configured and authenticated account.

```bash
# Run all integration tests
npm test

# Run specific test file
npx vitest run test/integration/tools.test.ts

# Run tests for a specific category
npx vitest run test/integration/tools.test.ts -t "Camera"
npx vitest run test/integration/tools.test.ts -t "Layout"
npx vitest run test/integration/tools.test.ts -t "Event"
```

The test suite covers:
- **Authentication Tools**: Account listing, status checking, account switching
- **Camera Tools**: Listing cameras, filtering by status, getting camera details
- **Media Tools**: Live snapshots, recorded images, recording intervals
- **Event Tools**: Event type listing, motion event queries
- **Alert Tools**: Alert listing and filtering
- **Bridge Tools**: Bridge listing and details
- **Layout Tools**: Layout listing, filtering, and details
- **Error Handling**: Invalid parameters, unknown tools

Configure the test account via environment variable:
```bash
TEST_USER=your-test-account@example.com npm test
```

### Prompt Testing

A bash script is provided to test natural language prompts against the MCP server via Claude Code:

```bash
# Interactive menu to select and run prompts
./test-prompts.sh

# List all available test prompts
./test-prompts.sh --list

# Run all prompts sequentially
./test-prompts.sh --all

# Run a specific prompt by number
./test-prompts.sh 3

# Run a custom prompt
./test-prompts.sh --custom "Show me a live image from camera 1005963a"
```

The script includes 22 pre-defined prompts covering all tool categories:
- Authentication (3 prompts)
- Cameras (4 prompts)
- Media (2 prompts)
- Events (2 prompts)
- Alerts (1 prompt)
- Bridges (2 prompts)
- Users (2 prompts)
- Layouts (5 prompts)
- Combined queries (1 prompt)

Additional example prompts are documented in `example-prompts.md`.

**Note**: The prompt testing script requires Claude Code to be installed and the MCP server to be configured in your Claude Code settings.

## Project Structure

```
een-api-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── api/                   # EEN API client functions
│   │   ├── client.ts         # Base HTTP client with auth
│   │   ├── cameras.ts        # Camera API
│   │   ├── bridges.ts        # Bridge API
│   │   ├── users.ts          # User API
│   │   ├── events.ts         # Event API
│   │   ├── alerts.ts         # Alert API
│   │   ├── media.ts          # Media/image API
│   │   └── layouts.ts        # Layout API
│   ├── auth/                  # Authentication module
│   │   ├── token-manager.ts  # Token storage and refresh
│   │   ├── oauth.ts          # OAuth login flow
│   │   └── crypto.ts         # Password encryption
│   ├── tools/                 # MCP tool definitions
│   │   ├── definitions.ts    # JSON Schema tool definitions
│   │   └── handlers.ts       # Tool implementation
│   └── types/                 # TypeScript type definitions
├── cli/
│   └── auth.ts               # Authentication CLI
├── test/
│   └── integration/          # Integration tests
├── .env                       # Environment variables (create this)
├── mcp-config-template.json  # Template MCP configuration
└── test-prompts.sh           # Prompt testing script
```

## Security

- **Credential Storage**: `~/.een-mcp/credentials.json` with `0600` permissions
- **Password Encryption**: AES-256-GCM with machine-specific keys
- **Token Management**: Automatic refresh 5 minutes before expiration
- **Refresh Token Rotation**: Supports EEN OAuth refresh token rotation
- **No Credentials in Code**: All secrets via environment variables or CLI

## Troubleshooting

### "No credentials file found"
Run the auth CLI to login:
```bash
npm run auth login -- --username user@example.com --persistPassword
```

### "No account selected"
The MCP tools automatically select the first available account, but you can explicitly set one:
```bash
# Via Claude
> "Set my EEN account to user@example.com"
```

### "Token expired"
If password is stored (`--persistPassword`), tokens auto-refresh. Otherwise, re-run login:
```bash
npm run auth login -- --username user@example.com
```

### "Authentication failed"
1. Verify your credentials are correct
2. Check that your OAuth client ID/secret are valid
3. Ensure your EEN account is active in the web console

### "MCP server not connecting"
1. Verify the path in your Claude configuration is correct
2. Ensure the project is built: `npm run build`
3. Check that Node.js 18+ is installed
4. Review Claude Desktop/Code logs for errors

## Development

```bash
# Run in development mode (auto-reload)
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Run integration tests
npm test

# Run auth CLI
npm run auth -- <command>
```

## License

MIT
