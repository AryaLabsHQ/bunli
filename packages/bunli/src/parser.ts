import type { Options, Flags } from './types.js'

interface ParsedArgs<T extends Flags> {
  flags: T
  positional: string[]
}

export async function parseArgs<T extends Flags>(
  args: string[],
  options: Options<T>
): Promise<ParsedArgs<T>> {
  const flags = {} as T
  const positional: string[] = []
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg.startsWith('--')) {
      // Long flag
      const [name, value] = arg.slice(2).split('=')
      const option = findOption(name, options)
      
      if (option) {
        const flagValue = value ?? args[++i]
        flags[option.name as keyof T] = await parseValue(flagValue, option.option) as T[keyof T]
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flag
      const short = arg.slice(1)
      const option = findOptionByShort(short, options)
      
      if (option) {
        if (option.option.type === 'boolean') {
          flags[option.name as keyof T] = true as T[keyof T]
        } else {
          const flagValue = args[++i]
          flags[option.name as keyof T] = await parseValue(flagValue, option.option) as T[keyof T]
        }
      }
    } else {
      // Positional argument
      positional.push(arg)
    }
  }
  
  // Apply defaults and check required
  for (const [name, option] of Object.entries(options)) {
    if (!(name in flags)) {
      if ('default' in option) {
        flags[name as keyof T] = option.default as T[keyof T]
      } else if (option.required) {
        throw new Error(`Missing required option: --${name}`)
      }
    }
  }
  
  return { flags, positional }
}

function findOption<T extends Flags>(
  name: string,
  options: Options<T>
): { name: string; option: Options<T>[keyof T] } | undefined {
  for (const [optName, option] of Object.entries(options)) {
    if (optName === name) {
      return { name: optName, option }
    }
  }
  return undefined
}

function findOptionByShort<T extends Flags>(
  short: string,
  options: Options<T>
): { name: string; option: Options<T>[keyof T] } | undefined {
  for (const [name, option] of Object.entries(options)) {
    if (option.short === short) {
      return { name, option }
    }
  }
  return undefined
}

async function parseValue(value: string, option: any): Promise<unknown> {
  // Basic type coercion
  let parsed: unknown = value
  
  switch (option.type) {
    case 'number':
      parsed = Number(value)
      if (isNaN(parsed as number)) {
        throw new Error(`Invalid number: ${value}`)
      }
      break
    case 'boolean':
      parsed = value === 'true' || value === '1' || value === undefined
      break
    case 'string':
      parsed = value
      break
  }
  
  // Validate with schema if provided
  if (option.schema) {
    const result = await option.schema['~standard'].validate(parsed)
    if (result.issues) {
      const issue = result.issues[0]
      throw new Error(issue.message || 'Validation failed')
    }
    return result.value
  }
  
  // Check choices
  if (option.choices && !option.choices.includes(parsed)) {
    throw new Error(`Invalid choice. Must be one of: ${option.choices.join(', ')}`)
  }
  
  return parsed
}