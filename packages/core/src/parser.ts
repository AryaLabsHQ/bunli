import type { Options, StandardSchemaV1, CLIOption } from './types.js'
import { BunliValidationError } from './types.js'
import { SchemaError } from '@standard-schema/utils'

export interface ParsedArgs {
  flags: Record<string, unknown>
  positional: string[]
}

export async function parseArgs(
  args: string[],
  options: Options,
  commandName: string = 'unknown'
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
  let stopParsingFlags = false
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg) continue
    
    // Handle -- separator: everything after is positional
    if (arg === '--') {
      stopParsingFlags = true
      continue
    }
    
    // After -- separator, treat everything as positional
    if (stopParsingFlags) {
      positional.push(arg)
      continue
    }
    
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
      flags[name] = await validateOption(name, value ?? 'true', options[name]!.schema, commandName)
      
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
        
        flags[name] = await validateOption(name, value ?? 'true', options[name]!.schema, commandName)
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
      flags[name] = await validateOption(name, undefined, opt.schema, commandName)
    }
  }
  
  return { flags, positional }
}

async function validateOption(
  name: string,
  value: unknown,
  schema: StandardSchemaV1,
  commandName: string = 'unknown'
): Promise<unknown> {
  // Convert string 'true'/'false' to boolean for boolean schemas
  let processedValue = value
  if (typeof value === 'string' && (value === 'true' || value === 'false')) {
    // Check if the schema expects a boolean by trying to validate true
    const testResult = await schema['~standard'].validate(true)
    if (!testResult.issues) {
      // Schema accepts boolean, convert the string
      processedValue = value === 'true'
    }
  }
  
  // Use Standard Schema validation
  const result = await schema['~standard'].validate(processedValue)
  
  if (result.issues && result.issues.length > 0) {
    const issue = result.issues[0]
    if (!issue) return processedValue // Fallback if no issues
    
    const expectedType = extractSchemaType(schema)
    const hint = generateHint(schema, value)
    
    throw new BunliValidationError(
      `Invalid option '${name}': ${issue.message}`,
      {
        option: name,
        value: value,
        command: commandName,
        expectedType,
        hint
      }
    )
  }
  
  return 'value' in result ? result.value : processedValue
}

/**
 * Extract a human-readable type description from a schema
 */
function extractSchemaType(schema: StandardSchemaV1): string {
  // Try to infer type from the schema structure
  if ('type' in schema && typeof schema.type === 'string') {
    return schema.type
  }
  
  // Fallback to checking common patterns
  if ('enum' in schema) return 'enum'
  if ('items' in schema) return 'array'
  if ('properties' in schema) return 'object'
  if ('format' in schema) return 'string'
  
  return 'unknown'
}

/**
 * Generate a helpful hint based on the schema and value
 */
function generateHint(schema: StandardSchemaV1, value: unknown): string {
  const type = extractSchemaType(schema)
  
  if (type === 'boolean' && typeof value === 'string') {
    return 'Use --flag or --no-flag for boolean options'
  }
  if (type === 'number' && typeof value === 'string') {
    return 'Provide a numeric value'
  }
  if (type === 'array' && !Array.isArray(value)) {
    return 'Provide a comma-separated list of values'
  }
  if (type === 'enum' && typeof value === 'string') {
    return 'Choose from the available options'
  }
  return ''
}