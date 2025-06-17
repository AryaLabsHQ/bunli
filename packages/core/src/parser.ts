import type { Options, StandardSchemaV1, CLIOption } from './types.js'
import { SchemaError } from '@standard-schema/utils'

interface ParsedArgs {
  flags: Record<string, unknown>
  positional: string[]
}

export async function parseArgs(
  args: string[],
  options: Options
): Promise<ParsedArgs> {
  const flags: Record<string, unknown> = {}
  const positional: string[] = []
  
  // Build lookup maps for short aliases
  const shortToName = new Map<string, string>()
  for (const [name, opt] of Object.entries(options)) {
    if (opt.short) {
      shortToName.set(opt.short, name)
    }
  }
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg) continue
    
    if (arg.startsWith('--')) {
      // Long flag: --name or --name=value
      const eqIndex = arg.indexOf('=')
      const name = eqIndex > 0 ? arg.slice(2, eqIndex) : arg.slice(2)
      const inlineValue = eqIndex > 0 ? arg.slice(eqIndex + 1) : undefined
      
      if (!name || !options[name]) continue
      
      // Get the value (inline, next arg, or 'true' for boolean-like flags)
      let value: string | undefined = inlineValue
      if (value === undefined && i + 1 < args.length && !args[i + 1]?.startsWith('-')) {
        value = args[++i]
      }
      
      // Pass the value to the schema for validation
      flags[name] = await validateOption(name, value ?? 'true', options[name]!.schema)
      
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flag: -n or -n value
      const short = arg.slice(1)
      const name = shortToName.get(short)
      
      if (name && options[name]) {
        // Get the next argument as value if available
        let value: string | undefined
        if (i + 1 < args.length && !args[i + 1]?.startsWith('-')) {
          value = args[++i]
        }
        
        flags[name] = await validateOption(name, value ?? 'true', options[name]!.schema)
      }
    } else {
      // Positional argument
      positional.push(arg)
    }
  }
  
  // Validate all options were provided (schemas handle their own defaults/required logic)
  // We run validation with undefined for options not provided on command line
  for (const [name, opt] of Object.entries(options)) {
    if (!(name in flags)) {
      flags[name] = await validateOption(name, undefined, opt.schema)
    }
  }
  
  return { flags, positional }
}

async function validateOption(
  name: string,
  value: unknown,
  schema: StandardSchemaV1
): Promise<unknown> {
  // Use Standard Schema validation
  const result = await schema['~standard'].validate(value)
  
  if (result.issues) {
    // Add the option name as path prefix for clearer error messages
    const issuesWithPath = result.issues.map(issue => ({
      ...issue,
      path: [name, ...(issue.path || [])]
    }))
    throw new SchemaError(issuesWithPath)
  }
  
  return result.value
}