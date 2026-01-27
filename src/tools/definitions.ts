/**
 * MCP Tool Definitions
 *
 * JSON Schema definitions for all MCP tools.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const toolDefinitions: Tool[] = [
  // ============================================================================
  // Authentication Tools
  // ============================================================================
  {
    name: 'een_auth_status',
    description: 'Check authentication status for all configured accounts. Shows which accounts are available and their token validity.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'een_list_accounts',
    description: 'List all configured EEN accounts. Returns account IDs that can be used with een_set_account.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'een_set_account',
    description: 'Set the active account for subsequent API calls. You must call this before making any API calls.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'The account email/ID to use for API calls'
        }
      },
      required: ['accountId']
    }
  },

  // ============================================================================
  // Camera Tools
  // ============================================================================
  {
    name: 'een_get_cameras',
    description: 'List cameras with optional pagination and filtering. Returns a paginated list of cameras in the account.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 100, max: 1000)'
        },
        pageToken: {
          type: 'string',
          description: 'Token for fetching the next page of results'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional fields to include (e.g., ["deviceInfo", "status", "streamUrls"])'
        },
        status__in: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by camera status (e.g., ["online", "offline"])'
        },
        name__contains: {
          type: 'string',
          description: 'Filter by name containing this substring'
        },
        q: {
          type: 'string',
          description: 'Full-text search query'
        }
      },
      required: []
    }
  },
  {
    name: 'een_get_camera',
    description: 'Get details for a single camera by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        cameraId: {
          type: 'string',
          description: 'The camera ID'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional fields to include (e.g., ["deviceInfo", "status", "shareDetails"])'
        }
      },
      required: ['cameraId']
    }
  },

  // ============================================================================
  // Media Tools
  // ============================================================================
  {
    name: 'een_get_live_image',
    description: 'Get a current live snapshot from a camera. Returns a base64-encoded JPEG image.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The camera/device ID'
        }
      },
      required: ['deviceId']
    }
  },
  {
    name: 'een_get_recorded_image',
    description: 'Get a recorded/historical image from a camera at a specific timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The camera/device ID'
        },
        timestamp: {
          type: 'string',
          description: 'ISO 8601 timestamp for exact match'
        },
        timestamp__gte: {
          type: 'string',
          description: 'ISO 8601 timestamp - get image at or after this time'
        },
        timestamp__lte: {
          type: 'string',
          description: 'ISO 8601 timestamp - get image at or before this time'
        },
        type: {
          type: 'string',
          enum: ['preview', 'main'],
          description: 'Stream type (default: preview)'
        }
      },
      required: ['deviceId']
    }
  },
  {
    name: 'een_list_media',
    description: 'List recording intervals (time periods with available recordings) for a camera.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          description: 'The camera/device ID'
        },
        startTimestamp: {
          type: 'string',
          description: 'ISO 8601 timestamp - start of time range'
        },
        endTimestamp: {
          type: 'string',
          description: 'ISO 8601 timestamp - end of time range (optional)'
        },
        type: {
          type: 'string',
          enum: ['preview', 'main'],
          description: 'Stream type (default: preview)'
        },
        mediaType: {
          type: 'string',
          enum: ['video', 'image'],
          description: 'Media type (default: video)'
        }
      },
      required: ['deviceId', 'startTimestamp']
    }
  },

  // ============================================================================
  // Event Tools
  // ============================================================================
  {
    name: 'een_get_events',
    description: 'Query events (motion, analytics, etc.) from cameras. Requires actor, event types, and start timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        actor: {
          type: 'string',
          description: 'Actor to filter by (format: "type:id", e.g., "camera:100d4c41")'
        },
        type__in: {
          type: 'array',
          items: { type: 'string' },
          description: 'Event types to include (e.g., ["een.motionDetectionEvent.v1"])'
        },
        startTimestamp: {
          type: 'string',
          description: 'ISO 8601 timestamp - events starting at or after this time'
        },
        endTimestamp: {
          type: 'string',
          description: 'ISO 8601 timestamp - events starting before this time (optional)'
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Data schemas to include (e.g., ["data.een.objectDetection.v1"])'
        }
      },
      required: ['actor', 'type__in', 'startTimestamp']
    }
  },
  {
    name: 'een_get_event_types',
    description: 'List available event types that can be used for filtering events.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of results per page'
        }
      },
      required: []
    }
  },

  // ============================================================================
  // User Tools
  // ============================================================================
  {
    name: 'een_get_current_user',
    description: 'Get the profile of the currently authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'een_get_users',
    description: 'List users in the account with optional pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of results per page'
        },
        pageToken: {
          type: 'string',
          description: 'Token for fetching the next page'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional fields to include (e.g., ["permissions"])'
        }
      },
      required: []
    }
  },
  {
    name: 'een_get_user',
    description: 'Get details for a specific user by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The user ID'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional fields to include'
        }
      },
      required: ['userId']
    }
  },

  // ============================================================================
  // Alert Tools
  // ============================================================================
  {
    name: 'een_get_alerts',
    description: 'List alerts (triggered notifications) with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        actorId__in: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by actor/camera IDs'
        },
        timestamp__gte: {
          type: 'string',
          description: 'ISO 8601 timestamp - alerts at or after this time'
        },
        timestamp__lte: {
          type: 'string',
          description: 'ISO 8601 timestamp - alerts at or before this time'
        },
        alertType__in: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by alert types'
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Fields to include (e.g., ["data", "actions"])'
        }
      },
      required: []
    }
  },

  // ============================================================================
  // Bridge Tools
  // ============================================================================
  {
    name: 'een_get_bridges',
    description: 'List bridge devices (hardware that connects cameras to the cloud) with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of results per page'
        },
        pageToken: {
          type: 'string',
          description: 'Token for fetching the next page'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional fields to include (e.g., ["deviceInfo", "networkInfo"])'
        },
        status__in: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by bridge status (e.g., ["online", "offline"])'
        }
      },
      required: []
    }
  },
  {
    name: 'een_get_bridge',
    description: 'Get details for a specific bridge by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        bridgeId: {
          type: 'string',
          description: 'The bridge ID'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional fields to include'
        }
      },
      required: ['bridgeId']
    }
  },

  // ============================================================================
  // Layout Tools
  // ============================================================================
  {
    name: 'een_get_layouts',
    description: 'List camera layouts (predefined grid views grouping multiple cameras). Returns layout names, camera assignments, and display settings.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 100, max: 1000)'
        },
        pageToken: {
          type: 'string',
          description: 'Token for fetching the next page of results'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional fields to include (e.g., ["effectivePermissions", "resourceCounts", "resourceStatusCounts"])'
        },
        name__contains: {
          type: 'string',
          description: 'Filter by name containing this substring'
        },
        q: {
          type: 'string',
          description: 'Full-text search query'
        }
      },
      required: []
    }
  },
  {
    name: 'een_get_layout',
    description: 'Get details for a specific layout by ID, including all camera panes and display settings.',
    inputSchema: {
      type: 'object',
      properties: {
        layoutId: {
          type: 'string',
          description: 'The layout ID'
        },
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional fields to include (e.g., ["effectivePermissions", "resourceCounts", "resourceStatusCounts"])'
        }
      },
      required: ['layoutId']
    }
  }
]
