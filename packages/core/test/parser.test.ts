import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { parseArgs } from '../src/parser.js'
import { option } from '../src/types.js'

describe('parseArgs repeatable options', () => {
  test('collects repeated long flags into arrays for repeatable options', async () => {
    const parsed = await parseArgs(
      ['--tag', 'ui', '--tag', 'backend'],
      {
        tag: option(z.array(z.string()).default([]), {
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
        tag: option(z.array(z.string()).default([]), {
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
          tag: option(z.array(z.string()), {
            repeatable: true,
          }),
        },
        'deploy'
      )
    }).toThrow(/Invalid option 'tag'/)
  })

  test('coerces repeated boolean string values before array validation', async () => {
    const parsed = await parseArgs(
      ['--flag', 'true', '--flag', 'false'],
      {
        flag: option(z.array(z.boolean()).default([]), {
          repeatable: true,
          argumentKind: 'flag',
        }),
      },
      'deploy'
    )

    expect(parsed.flags.flag).toEqual([true, false])
  })

  test('treats non-boolean adjacent tokens as positional for flag-kind booleans', async () => {
    const parsed = await parseArgs(
      ['--publish', 'maybe'],
      {
        publish: option(z.boolean().default(false), {
          argumentKind: 'flag',
        }),
      },
      'release'
    )

    expect(parsed.flags.publish).toBe(true)
    expect(parsed.positional).toEqual(['maybe'])
  })

  test('does not consume positional tokens for flag-kind booleans unless the value is explicit', async () => {
    const parsed = await parseArgs(
      ['--help', 'build'],
      {
        help: option(z.boolean().default(false), {
          argumentKind: 'flag',
        }),
      },
      'bunli'
    )

    expect(parsed.flags.help).toBe(true)
    expect(parsed.positional).toEqual(['build'])
  })

  test('keeps last-write-wins semantics for non-repeatable options', async () => {
    const parsed = await parseArgs(
      ['--tag', 'ui', '--tag', 'backend'],
      {
        tag: option(z.string().default('default')),
      },
      'deploy'
    )

    expect(parsed.flags.tag).toBe('backend')
  })

  test('applies schema defaults when repeatable options are omitted', async () => {
    const parsed = await parseArgs(
      [],
      {
        tag: option(z.array(z.string()).default([]), {
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
          tag: option(z.array(z.string())),
        },
        'deploy'
      )
    }).toThrow(/Invalid option 'tag'/)
  })

  test('consumes the next token for mixed boolean schemas when the value is valid', async () => {
    const parsed = await parseArgs(
      ['--mode', 'auto'],
      {
        mode: option(z.union([z.boolean(), z.literal('auto')]).default(false)),
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
          mode: option(z.union([z.boolean(), z.literal('auto')]).default(false)),
        },
        'deploy'
      )
    }).toThrow(/Invalid option 'mode'/)
  })

  test('does not skip invalid values for coercible non-boolean schemas', async () => {
    await expect(async () => {
      await parseArgs(
        ['--total', 'abc'],
        {
          total: option(z.coerce.number().int()),
        },
        'deploy'
      )
    }).toThrow(/Invalid option 'total'/)
  })
})
