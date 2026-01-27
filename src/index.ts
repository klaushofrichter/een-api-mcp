#!/usr/bin/env node
/**
 * EEN MCP Server
 *
 * Model Context Protocol server for Eagle Eye Networks camera systems.
 * Provides AI assistants with access to cameras, events, users, and media.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { config } from 'dotenv'

// Load environment variables
config()

import { toolDefinitions } from './tools/definitions.js'
import { handleToolCall } from './tools/handlers.js'
import { loadCredentials, getCredentialsPath } from './auth/token-manager.js'

// Server configuration
const SERVER_NAME = 'een-mcp-server'
const SERVER_VERSION = '1.0.0'

/**
 * Create and configure the MCP server.
 */
function createServer(): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION
    },
    {
      capabilities: {
        tools: {}
      }
    }
  )

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions
    }
  })

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    return handleToolCall(name, args ?? {})
  })

  return server
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  // Check for credentials on startup
  const credentialsResult = loadCredentials()
  if (credentialsResult.error) {
    if (credentialsResult.error.code === 'AUTH_REQUIRED') {
      console.error('Warning: No credentials found.')
      console.error('Run the auth CLI to configure accounts:')
      console.error('  npx tsx cli/auth.ts login --help')
      console.error('')
      console.error('The server will start, but API calls will fail until credentials are configured.')
    } else {
      console.error('Warning:', credentialsResult.error.message)
    }
  } else {
    console.error(`Credentials loaded from: ${getCredentialsPath()}`)
  }

  // Create server
  const server = createServer()

  // Create transport
  const transport = new StdioServerTransport()

  // Connect server to transport
  await server.connect(transport)

  console.error(`${SERVER_NAME} v${SERVER_VERSION} started`)
  console.error('Waiting for MCP client connection...')

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down...')
    await server.close()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.error('Shutting down...')
    await server.close()
    process.exit(0)
  })
}

// Run the server
main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
