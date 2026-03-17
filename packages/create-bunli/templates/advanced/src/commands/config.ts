import { defineCommand, option } from '@bunli/core'
import { Result, TaggedError } from 'better-result'
import { z } from 'zod'
import { loadConfig, saveConfig, getConfigPath } from '../utils/config.js'
import { DEFAULT_CONFIG } from '../utils/constants.js'

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

class ConfigCommandError extends TaggedError('ConfigCommandError')<{
  message: string
  cause?: unknown
}>() {
  constructor(message: string, cause?: unknown) {
    super(cause === undefined ? { message } : { message, cause })
  }
}

const configCommand = defineCommand({
  name: 'config',
  description: 'Manage configuration',
  commands: [
    defineCommand({
      name: 'get',
      description: 'Get a config value',
      handler: async ({ positional, colors }) => {
        const key = positional[0]
        if (!key) {
          console.error(colors.red('Usage: config get <key>'))
          process.exitCode = 1
          return
        }

        const configResult = await Result.tryPromise({
          try: () => loadConfig(),
          catch: (cause) => new ConfigCommandError(`Failed to load config: ${toErrorMessage(cause)}`, cause)
        })

        if (Result.isError(configResult)) {
          console.error(colors.red(configResult.error.message))
          process.exitCode = 1
          return
        }

        const value = getNestedValue(configResult.value as Record<string, unknown>, key)

        if (value === undefined) {
          console.log(colors.yellow(`Config key '${key}' not found`))
        } else {
          console.log(JSON.stringify(value, null, 2))
        }
      }
    }),

    defineCommand({
      name: 'set',
      description: 'Set a config value',
      handler: async ({ positional, colors, spinner }) => {
        const key = positional[0]
        const rawValue = positional[1]

        if (!key || rawValue === undefined) {
          console.error(colors.red('Usage: config set <key> <json-value>'))
          process.exitCode = 1
          return
        }

        const spin = spinner('Updating config...')
        spin.start()

        const configResult = await Result.tryPromise({
          try: () => loadConfig(),
          catch: (cause) => new ConfigCommandError(`Failed to load config: ${toErrorMessage(cause)}`, cause)
        })

        if (Result.isError(configResult)) {
          spin.fail('Failed to update config')
          console.error(colors.red(configResult.error.message))
          process.exitCode = 1
          return
        }

        const parsedValue = Result.try({
          try: () => JSON.parse(rawValue),
          catch: (cause) =>
            new ConfigCommandError(`Failed to parse value as JSON: ${toErrorMessage(cause)}`, cause)
        })

        if (Result.isError(parsedValue)) {
          spin.fail('Failed to update config')
          console.error(colors.red(parsedValue.error.message))
          process.exitCode = 1
          return
        }

        const nextConfig = configResult.value as Record<string, unknown>
        setNestedValue(nextConfig, key, parsedValue.value)

        const saveResult = await Result.tryPromise({
          try: () => saveConfig(nextConfig),
          catch: (cause) => new ConfigCommandError(`Failed to save config: ${toErrorMessage(cause)}`, cause)
        })

        if (Result.isError(saveResult)) {
          spin.fail('Failed to update config')
          console.error(colors.red(saveResult.error.message))
          process.exitCode = 1
          return
        }

        spin.succeed(`Config '${key}' updated`)
      }
    }),

    defineCommand({
      name: 'list',
      description: 'List all config values',
      handler: async ({ colors }) => {
        const configResult = await Result.tryPromise({
          try: () => loadConfig(),
          catch: (cause) => new ConfigCommandError(`Failed to load config: ${toErrorMessage(cause)}`, cause)
        })

        if (Result.isError(configResult)) {
          console.error(colors.red(configResult.error.message))
          process.exitCode = 1
          return
        }

        const configPathResult = await Result.tryPromise({
          try: () => getConfigPath(),
          catch: (cause) => new ConfigCommandError(`Failed to resolve config path: ${toErrorMessage(cause)}`, cause)
        })

        if (Result.isError(configPathResult)) {
          console.error(colors.red(configPathResult.error.message))
          process.exitCode = 1
          return
        }

        console.log(colors.bold('Configuration:'))
        console.log(colors.dim(`  File: ${configPathResult.value}`))
        console.log()
        console.log(JSON.stringify(configResult.value, null, 2))
      }
    }),

    defineCommand({
      name: 'reset',
      description: 'Reset config to defaults',
      options: {
        force: option(
          z.boolean().default(false),
          {
            short: 'f',
            description: 'Skip confirmation'
          }
        )
      },
      handler: async ({ flags, colors, prompt, spinner }) => {
        if (!flags.force) {
          const confirmed = await prompt.confirm(
            'This will reset all config to defaults. Continue?',
            { default: false }
          )

          if (!confirmed) {
            console.log(colors.yellow('Reset cancelled'))
            return
          }
        }

        const spin = spinner('Resetting config...')
        spin.start()

        const saveResult = await Result.tryPromise({
          try: () => saveConfig(DEFAULT_CONFIG),
          catch: (cause) => new ConfigCommandError(`Failed to save config: ${toErrorMessage(cause)}`, cause)
        })

        if (Result.isError(saveResult)) {
          spin.fail('Failed to reset config')
          console.error(colors.red(saveResult.error.message))
          process.exitCode = 1
          return
        }

        spin.succeed('Config reset to defaults')
      }
    })
  ]
})

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[key]
  }

  return current
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  const lastKey = keys.pop()
  if (!lastKey) {
    return
  }

  let current: Record<string, unknown> = obj

  for (const key of keys) {
    const next = current[key]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[lastKey] = value
}

export default configCommand
