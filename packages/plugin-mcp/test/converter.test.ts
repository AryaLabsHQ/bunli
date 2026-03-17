import { describe, expect, test } from 'bun:test'
import { Result } from 'better-result'
import { createCommandsFromMCPTools, extractCommandMetadata } from '../src/converter.js'
import {
  createIssueTool,
  updateStatusTool,
  listIssuesTool,
  searchTool,
  mockTools
} from './fixtures/mock-tools.js'

describe('createCommandsFromMCPTools', () => {
  const mockHandler = () => async () => {}
  const unwrapCommands = (result: ReturnType<typeof createCommandsFromMCPTools>) => {
    expect(Result.isOk(result)).toBe(true)
    if (Result.isError(result)) {
      throw result.error
    }
    return result.value
  }

  describe('command creation', () => {
    test('creates command from simple tool', () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        createHandler: mockHandler
      }))

      expect(commands).toHaveLength(1)
      expect(commands[0]!.name).toBe('create-issue')
      expect(commands[0]!.description).toBe('Create a new issue in the tracker')
    })

    test('creates commands from multiple tools', () => {
      const commands = unwrapCommands(createCommandsFromMCPTools(mockTools, {
        createHandler: mockHandler
      }))

      expect(commands).toHaveLength(mockTools.length)
    })

    test('applies namespace prefix', () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        namespace: 'linear',
        createHandler: mockHandler
      }))

      expect(commands[0]!.name).toBe('linear:create-issue')
    })

    test('uses custom command name transformer', () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        commandName: (name) => `custom-${name.toLowerCase()}`,
        createHandler: mockHandler
      }))

      expect(commands[0]!.name).toBe('custom-create_issue')
    })
  })

  describe('option conversion', () => {
    test('creates options from inputSchema properties', () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        createHandler: mockHandler
      }))

      const options = commands[0]!.options
      expect(options).toBeDefined()
      expect(options!['title']).toBeDefined()
      expect(options!['description']).toBeDefined()
      expect(options!['priority']).toBeDefined()
    })

    test('converts property names to kebab-case', () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        createHandler: mockHandler
      }))

      const options = commands[0]!.options
      expect(options!['assignee-id']).toBeDefined() // assigneeId → assignee-id
    })

    test('preserves option descriptions', () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        createHandler: mockHandler
      }))

      const titleOption = commands[0]!.options!['title']
      expect(titleOption.description).toBe('Issue title')
    })

    test('extracts short option from description', () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([searchTool], {
        createHandler: mockHandler
      }))

      const queryOption = commands[0]!.options!['query']
      expect(queryOption.short).toBe('q')
      expect(queryOption.description).toBe('Search query')

      const typeOption = commands[0]!.options!['type']
      expect(typeOption.short).toBe('t')
      expect(typeOption.description).toBe('Filter by type')
    })
  })

  describe('handler wiring', () => {
    test('calls createHandler with tool name', () => {
      const handlerCalls: string[] = []

      unwrapCommands(createCommandsFromMCPTools([createIssueTool, updateStatusTool], {
        createHandler: (toolName) => {
          handlerCalls.push(toolName)
          return async () => {}
        }
      }))

      expect(handlerCalls).toContain('create_issue')
      expect(handlerCalls).toContain('update_status')
    })
  })

  describe('schema validation', () => {
    test('required fields are validated', async () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        createHandler: mockHandler
      }))

      const titleOption = commands[0]!.options!['title']
      const result = titleOption.schema['~standard'].validate('Test Title')
      expect(result.issues).toBeUndefined()
    })

    test('optional fields accept undefined', async () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        createHandler: mockHandler
      }))

      const descriptionOption = commands[0]!.options!['description']
      const result = descriptionOption.schema['~standard'].validate(undefined)
      expect(result.issues).toBeUndefined()
    })

    test('enum options validate against allowed values', async () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([updateStatusTool], {
        createHandler: mockHandler
      }))

      const statusOption = commands[0]!.options!['status']

      const validResult = statusOption.schema['~standard'].validate('todo')
      expect(validResult.issues).toBeUndefined()
    })

    test('number options with constraints validate correctly', async () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([createIssueTool], {
        createHandler: mockHandler
      }))

      const priorityOption = commands[0]!.options!['priority']

      // Valid range (0-4)
      expect(priorityOption.schema['~standard'].validate(0).issues).toBeUndefined()
      expect(priorityOption.schema['~standard'].validate(4).issues).toBeUndefined()

      // Out of range
      expect(priorityOption.schema['~standard'].validate(-1).issues).toBeDefined()
      expect(priorityOption.schema['~standard'].validate(5).issues).toBeDefined()
    })
  })

  describe('default values', () => {
    test('applies default values from schema', async () => {
      const commands = unwrapCommands(createCommandsFromMCPTools([listIssuesTool], {
        createHandler: mockHandler
      }))

      // Verify that fields with defaults accept undefined (they're effectively optional)
      const includeArchivedOption = commands[0]!.options!['include-archived']
      const includeArchivedResult = includeArchivedOption.schema['~standard'].validate(undefined)
      expect(includeArchivedResult.issues).toBeUndefined()

      const limitOption = commands[0]!.options!['limit']
      const limitResult = limitOption.schema['~standard'].validate(undefined)
      expect(limitResult.issues).toBeUndefined()

      // Verify explicit values still work
      const explicitResult = includeArchivedOption.schema['~standard'].validate(true)
      expect(explicitResult.value).toBe(true)

      const explicitLimitResult = limitOption.schema['~standard'].validate(25)
      expect(explicitLimitResult.value).toBe(25)
    })

    test('returns Err when input schema conversion fails', () => {
      const badTool = {
        ...createIssueTool,
        inputSchema: {
          ...createIssueTool.inputSchema,
          properties: {
            title: { type: 'string', pattern: '[' }
          },
          required: ['title']
        }
      }

      const commands = createCommandsFromMCPTools([badTool], {
        createHandler: mockHandler
      })
      expect(Result.isError(commands)).toBe(true)
    })
  })
})

describe('extractCommandMetadata', () => {
  test('extracts basic metadata', () => {
    const meta = extractCommandMetadata(createIssueTool, 'linear')

    expect(meta.name).toBe('linear:create-issue')
    expect(meta.toolName).toBe('create_issue')
    expect(meta.namespace).toBe('linear')
    expect(meta.description).toBe('Create a new issue in the tracker')
  })

  test('extracts option metadata', () => {
    const meta = extractCommandMetadata(createIssueTool)

    expect(meta.options['title']).toBeDefined()
    expect(meta.options['title']!.type).toBe('string')
    expect(meta.options['title']!.required).toBe(true)
    expect(meta.options['title']!.description).toBe('Issue title')

    expect(meta.options['priority']).toBeDefined()
    expect(meta.options['priority']!.type).toBe('integer')
    expect(meta.options['priority']!.required).toBe(false)
    expect(meta.options['priority']!.minimum).toBe(0)
    expect(meta.options['priority']!.maximum).toBe(4)
  })

  test('extracts enum values', () => {
    const meta = extractCommandMetadata(updateStatusTool)

    expect(meta.options['status']!.enumValues).toEqual([
      'todo', 'in_progress', 'done', 'cancelled'
    ])
  })

  test('extracts short options from descriptions', () => {
    const meta = extractCommandMetadata(searchTool)

    expect(meta.options['query']!.short).toBe('q')
    expect(meta.options['query']!.description).toBe('Search query')
  })

  test('extracts default values', () => {
    const meta = extractCommandMetadata(listIssuesTool)

    expect(meta.options['include-archived']!.hasDefault).toBe(true)
    expect(meta.options['include-archived']!.default).toBe(false)

    expect(meta.options['limit']!.hasDefault).toBe(true)
    expect(meta.options['limit']!.default).toBe(50)
  })
})
