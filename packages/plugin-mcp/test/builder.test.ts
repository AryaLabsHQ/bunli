import { describe, expect, test } from 'bun:test'
import { Commands, CommandBuilder } from '../src/builder.js'
import type { MCPTool } from '../src/types.js'

const sampleTools: MCPTool[] = [
  {
    name: 'web_search',
    description: 'Search the web for information',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        numResults: { type: 'integer', description: 'Number of results', default: 10 }
      },
      required: ['query']
    }
  },
  {
    name: 'find_similar',
    description: 'Find similar content',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to find similar content for' },
        excludeDomains: { type: 'array', description: 'Domains to exclude' }
      },
      required: ['url']
    }
  }
]

describe('CommandBuilder', () => {
  describe('static from()', () => {
    test('creates a builder from tools', () => {
      const builder = Commands.from(sampleTools)
      expect(builder).toBeInstanceOf(CommandBuilder)
    })
  })

  describe('fluent API', () => {
    test('namespace() sets namespace prefix', () => {
      const commands = Commands.from(sampleTools)
        .namespace('exa')
        .commands()

      expect(commands).toContain("name: 'exa:web-search'")
      expect(commands).toContain("name: 'exa:find-similar'")
    })

    test('timeout() sets default timeout', () => {
      const builder = Commands.from(sampleTools).timeout(30000)
      expect(builder.getTimeout()).toBe(30000)
    })

    test('includeRawOption() controls --raw flag', () => {
      const withRaw = Commands.from(sampleTools).commands()
      const withoutRaw = Commands.from(sampleTools).includeRawOption(false).commands()

      expect(withRaw).toContain("'raw': option(z.string().optional()")
      expect(withoutRaw).not.toContain("'raw': option(z.string().optional()")
    })

    test('includeTimeoutOption() controls --timeout flag', () => {
      const withTimeout = Commands.from(sampleTools).commands()
      const withoutTimeout = Commands.from(sampleTools).includeTimeoutOption(false).commands()

      expect(withTimeout).toContain("'timeout': option(z.coerce.number().optional()")
      expect(withoutTimeout).not.toContain("'timeout': option(z.coerce.number().optional()")
    })

    test('includeOutputOption() controls --output flag', () => {
      const withOutput = Commands.from(sampleTools).commands()
      const withoutOutput = Commands.from(sampleTools).includeOutputOption(false).commands()

      expect(withOutput).toContain("'output': option(z.enum(['text', 'json', 'raw'])")
      expect(withoutOutput).not.toContain("'output': option(z.enum(['text', 'json', 'raw'])")
    })

    test('methods can be chained', () => {
      const builder = Commands.from(sampleTools)
        .namespace('test')
        .timeout(5000)
        .includeRawOption(false)
        .includeTimeoutOption(false)
        .includeOutputOption(false)

      expect(builder.getTimeout()).toBe(5000)
      expect(builder.count()).toBe(2)
    })
  })

  describe('commands()', () => {
    test('generates command definitions', () => {
      const commands = Commands.from(sampleTools).commands()

      expect(commands).toContain('const WebSearchCommand = defineCommand({')
      expect(commands).toContain('const FindSimilarCommand = defineCommand({')
    })

    test('includes tool descriptions', () => {
      const commands = Commands.from(sampleTools).commands()

      expect(commands).toContain('Search the web for information')
      expect(commands).toContain('Find similar content')
    })

    test('generates option definitions', () => {
      const commands = Commands.from(sampleTools).commands()

      expect(commands).toContain("'query': option(z.string()")
      expect(commands).toContain("'num-results': option(z.coerce.number().int()")
    })

    test('generates handler with callTool', () => {
      const commands = Commands.from(sampleTools).commands()

      expect(commands).toContain("callTool('web_search'")
      expect(commands).toContain("callTool('find_similar'")
    })
  })

  describe('registrations()', () => {
    test('generates cli.command() calls', () => {
      const registrations = Commands.from(sampleTools).registrations()

      expect(registrations).toContain('cli.command(WebSearchCommand)')
      expect(registrations).toContain('cli.command(FindSimilarCommand)')
    })

    test('respects namespace in variable names', () => {
      const registrations = Commands.from(sampleTools)
        .namespace('exa')
        .registrations()

      expect(registrations).toContain('cli.command(ExaWebSearchCommand)')
      expect(registrations).toContain('cli.command(ExaFindSimilarCommand)')
    })
  })

  describe('commandNames()', () => {
    test('returns array of command variable names', () => {
      const names = Commands.from(sampleTools).commandNames()

      expect(names).toEqual(['WebSearchCommand', 'FindSimilarCommand'])
    })

    test('respects namespace', () => {
      const names = Commands.from(sampleTools).namespace('exa').commandNames()

      expect(names).toEqual(['ExaWebSearchCommand', 'ExaFindSimilarCommand'])
    })
  })

  describe('count()', () => {
    test('returns number of tools', () => {
      expect(Commands.from(sampleTools).count()).toBe(2)
      expect(Commands.from([]).count()).toBe(0)
    })
  })

  describe('edge cases', () => {
    test('handles empty tools array', () => {
      const builder = Commands.from([])

      expect(builder.commands()).toBe('')
      expect(builder.registrations()).toBe('')
      expect(builder.commandNames()).toEqual([])
      expect(builder.count()).toBe(0)
    })

    test('handles tools without inputSchema', () => {
      const tools: MCPTool[] = [
        { name: 'simple_action', description: 'A simple action' }
      ]

      const commands = Commands.from(tools).commands()
      expect(commands).toContain('const SimpleActionCommand = defineCommand({')
    })

    test('handles tools with enum options', () => {
      const tools: MCPTool[] = [
        {
          name: 'search',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['web', 'image', 'news'] }
            }
          }
        }
      ]

      const commands = Commands.from(tools).commands()
      expect(commands).toContain("z.enum(['web', 'image', 'news'])")
    })

    test('escapes special characters in descriptions', () => {
      const tools: MCPTool[] = [
        {
          name: 'test',
          description: "Tool with 'quotes' and \"double quotes\""
        }
      ]

      const commands = Commands.from(tools).commands()
      expect(commands).toContain("\\'quotes\\'")
    })
  })
})
