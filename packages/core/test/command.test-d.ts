import { expectTypeOf, test } from 'vitest'
import { z } from 'zod'
import { defineCommand, option } from '../src/types.js'
import type { CLIOption, Command, RunnableCommand, Group } from '../src/types.js'

test('option() preserves schema type in CLIOption', () => {
  const opt = option(z.string(), { short: 'n', description: 'Name' })
  expectTypeOf(opt).toMatchTypeOf<CLIOption>()
  expectTypeOf(opt.schema).toMatchTypeOf<z.ZodString>()
})

test('option() with default preserves output type', () => {
  const opt = option(z.number().default(42))
  expectTypeOf(opt.schema).toMatchTypeOf<z.ZodDefault<z.ZodNumber>>()
})

test('defineCommand infers handler flags from options', () => {
  const cmd = defineCommand({
    name: 'test',
    description: 'Test command',
    options: {
      name: option(z.string()),
      verbose: option(z.boolean().default(false)),
      count: option(z.number().optional()),
    },
    handler({ flags }) {
      expectTypeOf(flags.name).toEqualTypeOf<string>()
      expectTypeOf(flags.verbose).toEqualTypeOf<boolean>()
      expectTypeOf(flags.count).toEqualTypeOf<number | undefined>()
    },
  })

  expectTypeOf(cmd.name).toEqualTypeOf<'test'>()
})

test('defineCommand without options infers Record<string, unknown> flags', () => {
  defineCommand({
    name: 'ping',
    description: 'Ping',
    handler({ flags }) {
      // Without options, flags defaults to Record<string, unknown>
      expectTypeOf(flags).toEqualTypeOf<Record<string, unknown>>()
    },
  })
})

test('defineCommand handler receives positional args', () => {
  defineCommand({
    name: 'run',
    description: 'Run',
    handler({ positional }) {
      expectTypeOf(positional).toEqualTypeOf<string[]>()
    },
  })
})

test('Command is a union of RunnableCommand and Group', () => {
  expectTypeOf<RunnableCommand>().toMatchTypeOf<Command>()
  expectTypeOf<Group>().toMatchTypeOf<Command>()
})

test('defineCommand name literal is preserved', () => {
  const cmd = defineCommand({
    name: 'deploy' as const,
    description: 'Deploy',
    handler() {},
  })
  expectTypeOf(cmd.name).toEqualTypeOf<'deploy'>()
})
