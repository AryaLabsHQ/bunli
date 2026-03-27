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
