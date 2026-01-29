/**
 * Mock MCP tool schemas for testing
 */

import type { MCPTool } from '../../src/types.js'

/**
 * Simple tool with string and number parameters
 */
export const createIssueTool: MCPTool = {
  name: 'create_issue',
  description: 'Create a new issue in the tracker',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Issue title'
      },
      description: {
        type: 'string',
        description: 'Issue description'
      },
      priority: {
        type: 'integer',
        description: 'Priority level (0-4)',
        minimum: 0,
        maximum: 4
      },
      assigneeId: {
        type: 'string',
        description: 'ID of the assignee'
      }
    },
    required: ['title']
  }
}

/**
 * Tool with enum parameter
 */
export const updateStatusTool: MCPTool = {
  name: 'update_status',
  description: 'Update the status of an issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueId: {
        type: 'string',
        description: 'ID of the issue to update'
      },
      status: {
        type: 'string',
        description: 'New status',
        enum: ['todo', 'in_progress', 'done', 'cancelled']
      }
    },
    required: ['issueId', 'status']
  }
}

/**
 * Tool with array parameter
 */
export const addLabelsTool: MCPTool = {
  name: 'add_labels',
  description: 'Add labels to an issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueId: {
        type: 'string',
        description: 'ID of the issue'
      },
      labels: {
        type: 'array',
        description: 'Labels to add',
        items: {
          type: 'string'
        }
      }
    },
    required: ['issueId', 'labels']
  }
}

/**
 * Tool with boolean parameter and default value
 */
export const listIssuesTool: MCPTool = {
  name: 'list_issues',
  description: 'List issues with optional filters',
  inputSchema: {
    type: 'object',
    properties: {
      teamId: {
        type: 'string',
        description: 'Filter by team ID'
      },
      includeArchived: {
        type: 'boolean',
        description: 'Include archived issues',
        default: false
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of results',
        minimum: 1,
        maximum: 100,
        default: 50
      }
    },
    required: ['teamId']
  }
}

/**
 * Tool with no parameters
 */
export const getCurrentUserTool: MCPTool = {
  name: 'get_current_user',
  description: 'Get information about the current user',
  inputSchema: {
    type: 'object',
    properties: {}
  }
}

/**
 * Tool with camelCase property names
 */
export const createCommentTool: MCPTool = {
  name: 'createComment',
  description: 'Create a comment on an issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueId: {
        type: 'string',
        description: 'Issue ID'
      },
      commentBody: {
        type: 'string',
        description: 'Comment content'
      },
      isInternal: {
        type: 'boolean',
        description: 'Mark as internal note'
      }
    },
    required: ['issueId', 'commentBody']
  }
}

/**
 * Tool with short option hints in description
 */
export const searchTool: MCPTool = {
  name: 'search',
  description: 'Search for issues',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '[-q] Search query'
      },
      type: {
        type: 'string',
        description: '[-t] Filter by type',
        enum: ['issue', 'project', 'user']
      }
    },
    required: ['query']
  }
}

/**
 * Collection of all mock tools
 */
export const mockTools: MCPTool[] = [
  createIssueTool,
  updateStatusTool,
  addLabelsTool,
  listIssuesTool,
  getCurrentUserTool,
  createCommentTool,
  searchTool
]

/**
 * Tool with nested object (for testing object handling)
 */
export const complexTool: MCPTool = {
  name: 'create_webhook',
  description: 'Create a webhook',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Webhook URL',
        format: 'uri'
      },
      events: {
        type: 'array',
        description: 'Events to subscribe to',
        items: {
          type: 'string',
          enum: ['issue.created', 'issue.updated', 'issue.deleted']
        }
      },
      secret: {
        type: 'string',
        description: 'Webhook secret for verification',
        minLength: 16
      },
      config: {
        type: 'object',
        description: 'Additional configuration',
        properties: {
          retries: {
            type: 'integer',
            default: 3
          },
          timeout: {
            type: 'integer',
            default: 30000
          }
        }
      }
    },
    required: ['url', 'events']
  }
}
