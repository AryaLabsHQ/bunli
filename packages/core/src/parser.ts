import type { Options } from './types.js'
import { AggregateValidationError, type ValidationIssue } from './errors.js'
import { coerceValue, coerceArray } from './coerce.js'
import { extractSchemaType, generateHint } from './utils/schema-helpers.js'
import { findSuggestion } from './utils/levenshtein.js'

export interface ParseOptions {
  /** When true, unknown flags throw AggregateValidationError with typo suggestions. Default: true */
  strict?: boolean
}

export interface ParsedArgs {
  flags: Record<string, unknown>
  positional: string[]
  unknownFlags: string[]
}

export async function parseArgs(
  args: string[],
  options: Options,
  commandName: string = 'unknown',
  parseOptions?: ParseOptions
): Promise<ParsedArgs> {
  const strict = parseOptions?.strict ?? true
  const rawFlags: Record<string, string | undefined> = {}
  const repeatableRaw: Record<string, unknown[]> = {}
  const positional: string[] = []
  const unknownFlags: string[] = []

  // Build lookup maps for short aliases
  const shortToName = new Map<string, string>()
  for (const [name, opt] of Object.entries(options)) {
    if (opt.short) {
      shortToName.set(opt.short, name)
    }
  }

  // ── Pass 1: collect raw string values ──────────────────────────────
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

      if (!name || !options[name]) {
        if (name) unknownFlags.push(name)
        continue
      }

      // Get the value (inline, next arg, or 'true' for boolean-like flags)
      let value: string | undefined = inlineValue
      if (value === undefined && i + 1 < args.length && !args[i + 1]?.startsWith('-')) {
        value = args[++i]
      }

      const option = options[name]
      if (!option) continue
      const parsedValue = value ?? (option.argumentKind === 'flag' ? 'true' : undefined)

      if (option.repeatable) {
        if (!repeatableRaw[name]) repeatableRaw[name] = []
        repeatableRaw[name].push(parsedValue)
      } else {
        rawFlags[name] = parsedValue
      }

    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flag: -n or -n value
      const short = arg.slice(1)
      const name = shortToName.get(short)

      if (!name || !options[name]) {
        continue
      }

      const option = options[name]
      if (!option) continue

      // Get the next argument as value if available
      let value: string | undefined
      if (i + 1 < args.length && !args[i + 1]?.startsWith('-')) {
        value = args[++i]
      }
      const parsedValue = value ?? (option.argumentKind === 'flag' ? 'true' : undefined)

      if (option.repeatable) {
        if (!repeatableRaw[name]) repeatableRaw[name] = []
        repeatableRaw[name].push(parsedValue)
      } else {
        rawFlags[name] = parsedValue
      }
    } else {
      // Positional argument
      positional.push(arg)
    }
  }

  // ── Pass 2: coerce + validate all collected values ─────────────────
  const flags: Record<string, unknown> = {}
  const issues: ValidationIssue[] = []

  // Process explicitly provided flags
  for (const [name, rawValue] of Object.entries(rawFlags)) {
    const option = options[name]
    if (!option) continue
    const result = await coerceValue(rawValue, option.schema)
    if (result.coerced) {
      flags[name] = result.value
    } else {
      // Coercion failed — validate raw to get error message
      const valResult = await option.schema['~standard'].validate(rawValue)
      if (valResult.issues && valResult.issues.length > 0) {
        const issue = valResult.issues[0]
        issues.push({
          option: name,
          message: issue ? issue.message : `Invalid value for '${name}'`,
          value: rawValue,
          expectedType: extractSchemaType(option.schema),
          hint: generateHint(option.schema, rawValue)
        })
      } else {
        flags[name] = 'value' in valResult ? valResult.value : rawValue
      }
    }
  }

  // Process repeatable flags
  for (const [name, values] of Object.entries(repeatableRaw)) {
    const option = options[name]
    if (!option) continue
    const result = await coerceArray(values, option.schema)
    if (result.coerced) {
      flags[name] = result.value
    } else {
      const valResult = await option.schema['~standard'].validate(values)
      if (valResult.issues && valResult.issues.length > 0) {
        const issue = valResult.issues[0]
        issues.push({
          option: name,
          message: issue ? issue.message : `Invalid value for '${name}'`,
          value: values,
          expectedType: extractSchemaType(option.schema),
          hint: generateHint(option.schema, values)
        })
      } else {
        flags[name] = 'value' in valResult ? valResult.value : values
      }
    }
  }

  // Process options not provided on command line (schemas handle defaults/required)
  for (const [name, opt] of Object.entries(options)) {
    if (name in flags || name in rawFlags || name in repeatableRaw) continue
    const result = await coerceValue(undefined, opt.schema)
    if (result.coerced) {
      flags[name] = result.value
    } else {
      // Validate undefined to get the default or error
      const valResult = await opt.schema['~standard'].validate(undefined)
      if (valResult.issues && valResult.issues.length > 0) {
        const issue = valResult.issues[0]
        issues.push({
          option: name,
          message: issue ? issue.message : `Missing required option '${name}'`,
          value: undefined,
          expectedType: extractSchemaType(opt.schema),
          hint: generateHint(opt.schema, undefined)
        })
      } else {
        flags[name] = 'value' in valResult ? valResult.value : undefined
      }
    }
  }

  // Process unknown flags — generate typo suggestions (strict mode only)
  if (strict) {
    const knownNames = Object.keys(options)
    for (const flag of unknownFlags) {
      const suggestion = findSuggestion(flag, knownNames)
      issues.push({
        option: flag,
        message: suggestion
          ? `Unknown option '--${flag}'. Did you mean '--${suggestion}'?`
          : `Unknown option '--${flag}'`,
        value: undefined,
        expectedType: 'unknown',
        suggestion: suggestion || undefined
      })
    }
  }

  if (issues.length > 0) {
    throw new AggregateValidationError({
      message: `Validation failed for command '${commandName}'`,
      command: commandName,
      issues
    })
  }

  return { flags, positional, unknownFlags: [] }
}
