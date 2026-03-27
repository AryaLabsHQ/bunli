import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { parseArgs } from '../src/parser.js'
import { defineOption } from '../src/types.js'
import { AggregateValidationError } from '../src/errors.js'

describe('parseArgs repeatable options', () => {
  test('collects repeated long flags into arrays for repeatable options', async () => {
    const parsed = await parseArgs(
      ['--tag', 'ui', '--tag', 'backend'],
      {
        tag: defineOption(z.array(z.string()).default([]), {
          description: 'Tags',
          repeatable: true,
        }),
      },
      'deploy'
    )

    expect(parsed.flags.tag).toEqual(['ui', 'backend'])
  })

  test('collects repeated short flags into arrays for repeatable options', async () => {
    const parsed = await parseArgs(
      ['-t', 'ui', '-t', 'backend'],
      {
        tag: defineOption(z.array(z.string()).default([]), {
          short: 't',
          repeatable: true,
        }),
      },
      'deploy'
    )

    expect(parsed.flags.tag).toEqual(['ui', 'backend'])
  })

  test('rejects missing values for repeatable value options', async () => {
    await expect(async () => {
      await parseArgs(
        ['--tag'],
        {
          tag: defineOption(z.array(z.string()), {
            repeatable: true,
          }),
        },
        'deploy'
      )
    }).toThrow(AggregateValidationError)
  })

  test('coerces repeated boolean string values before array validation', async () => {
    const parsed = await parseArgs(
      ['--flag', 'true', '--flag', 'false'],
      {
        flag: defineOption(z.array(z.boolean()).default([]), {
          repeatable: true,
          argumentKind: 'flag',
        }),
      },
      'deploy'
    )

    expect(parsed.flags.flag).toEqual([true, false])
  })

  test('rejects invalid explicit values for flag-kind booleans', async () => {
    await expect(async () => {
      await parseArgs(
        ['--publish', 'maybe'],
        {
          publish: defineOption(z.boolean().default(false), {
            argumentKind: 'flag',
          }),
        },
        'release'
      )
    }).toThrow(AggregateValidationError)
  })

  test('keeps last-write-wins semantics for non-repeatable options', async () => {
    const parsed = await parseArgs(
      ['--tag', 'ui', '--tag', 'backend'],
      {
        tag: defineOption(z.string().default('default')),
      },
      'deploy'
    )

    expect(parsed.flags.tag).toBe('backend')
  })

  test('applies schema defaults when repeatable options are omitted', async () => {
    const parsed = await parseArgs(
      [],
      {
        tag: defineOption(z.array(z.string()).default([]), {
          repeatable: true,
        }),
      },
      'deploy'
    )

    expect(parsed.flags.tag).toEqual([])
  })

  test('throws for array schemas that are not marked repeatable', async () => {
    await expect(async () => {
      await parseArgs(
        ['--tag', 'ui'],
        {
          tag: defineOption(z.array(z.string())),
        },
        'deploy'
      )
    }).toThrow(AggregateValidationError)
  })

  test('consumes the next token for mixed boolean schemas when the value is valid', async () => {
    const parsed = await parseArgs(
      ['--mode', 'auto'],
      {
        mode: defineOption(z.union([z.boolean(), z.literal('auto')]).default(false)),
      },
      'deploy'
    )

    expect(parsed.flags.mode).toBe('auto')
    expect(parsed.positional).toEqual([])
  })

  test('treats invalid mixed boolean option values as option errors', async () => {
    await expect(async () => {
      await parseArgs(
        ['--mode', 'invalid'],
        {
          mode: defineOption(z.union([z.boolean(), z.literal('auto')]).default(false)),
        },
        'deploy'
      )
    }).toThrow(AggregateValidationError)
  })

  test('does not skip invalid values for coercible non-boolean schemas', async () => {
    await expect(async () => {
      await parseArgs(
        ['--total', 'abc'],
        {
          total: defineOption(z.coerce.number().int()),
        },
        'deploy'
      )
    }).toThrow(AggregateValidationError)
  })
})

describe('parseArgs auto-coercion', () => {
  test('coerces string to number without z.coerce', async () => {
    const parsed = await parseArgs(
      ['--port', '3000'],
      { port: defineOption(z.number().min(1)) },
      'serve'
    )
    expect(parsed.flags.port).toBe(3000)
  })

  test('coerces "yes" to boolean', async () => {
    const parsed = await parseArgs(
      ['--verbose', 'yes'],
      { verbose: defineOption(z.boolean().default(false)) },
      'build'
    )
    expect(parsed.flags.verbose).toBe(true)
  })

  test('coerces "no" to boolean', async () => {
    const parsed = await parseArgs(
      ['--verbose', 'no'],
      { verbose: defineOption(z.boolean().default(false)) },
      'build'
    )
    expect(parsed.flags.verbose).toBe(false)
  })

  test('coerces "0" to boolean false', async () => {
    const parsed = await parseArgs(
      ['--debug', '0'],
      { debug: defineOption(z.boolean().default(false)) },
      'run'
    )
    expect(parsed.flags.debug).toBe(false)
  })

  test('surfaces constraint errors, not type-mismatch errors', async () => {
    try {
      await parseArgs(
        ['--port', '70000'],
        { port: defineOption(z.number().max(65535)) },
        'serve'
      )
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateValidationError)
      const aggError = error as InstanceType<typeof AggregateValidationError>
      const portIssue = aggError.issues.find(i => i.option === 'port')
      expect(portIssue).toBeDefined()
      // Must say "65535" (constraint), NOT "Expected number, received string"
      expect(portIssue!.message).toContain('65535')
      expect(portIssue!.message).not.toContain('received string')
    }
  })
})

describe('parseArgs error accumulation', () => {
  test('reports multiple validation errors at once', async () => {
    try {
      await parseArgs(
        ['--port', 'abc', '--name', ''],
        {
          port: defineOption(z.number()),
          name: defineOption(z.string().min(1)),
        },
        'serve'
      )
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateValidationError)
      const aggError = error as InstanceType<typeof AggregateValidationError>
      expect(aggError.issues.length).toBe(2)
      expect(aggError.issues.map(i => i.option)).toContain('port')
      expect(aggError.issues.map(i => i.option)).toContain('name')
    }
  })

  test('includes unknown flags in aggregate error', async () => {
    try {
      await parseArgs(
        ['--unknownflag', 'value'],
        { port: defineOption(z.number().default(3000)) },
        'serve'
      )
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateValidationError)
      const aggError = error as InstanceType<typeof AggregateValidationError>
      expect(aggError.issues.some(i => i.option === 'unknownflag')).toBe(true)
    }
  })
})

describe('parseArgs unknownFlags return value', () => {
  test('returns unknown flags in lenient mode', async () => {
    const parsed = await parseArgs(
      ['--known', 'val', '--unknown1', '--unknown2', 'x'],
      { known: defineOption(z.string()) },
      'cmd',
      { strict: false }
    )
    expect(parsed.flags.known).toBe('val')
    expect(parsed.unknownFlags).toEqual(['unknown1', 'unknown2'])
  })

  test('returns empty unknownFlags when all flags are known', async () => {
    const parsed = await parseArgs(
      ['--name', 'hello'],
      { name: defineOption(z.string()) },
      'cmd'
    )
    expect(parsed.unknownFlags).toEqual([])
  })
})

describe('parseArgs typo suggestions', () => {
  test('suggests --verbose for --verbos', async () => {
    try {
      await parseArgs(
        ['--verbos'],
        { verbose: defineOption(z.boolean().default(false), { argumentKind: 'flag' }) },
        'build'
      )
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateValidationError)
      const aggError = error as InstanceType<typeof AggregateValidationError>
      const issue = aggError.issues.find(i => i.option === 'verbos')
      expect(issue).toBeDefined()
      expect(issue!.suggestion).toBe('verbose')
      expect(issue!.message).toContain('Did you mean')
    }
  })

  test('does not suggest for completely unrelated flags', async () => {
    try {
      await parseArgs(
        ['--xyz'],
        { verbose: defineOption(z.boolean().default(false), { argumentKind: 'flag' }) },
        'build'
      )
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateValidationError)
      const aggError = error as InstanceType<typeof AggregateValidationError>
      const issue = aggError.issues.find(i => i.option === 'xyz')
      expect(issue).toBeDefined()
      expect(issue!.suggestion).toBeUndefined()
    }
  })
})
