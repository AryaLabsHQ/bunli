/**
 * Runtime validation utilities for Bunli
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { BunliValidationError } from './types.js'

/**
 * Validate a value against a schema at runtime
 */
export async function validateValue(
  value: unknown,
  schema: StandardSchemaV1,
  context: {
    option: string
    command: string
  }
): Promise<unknown> {
  try {
    const result = await schema['~standard'].validate(value)
    
    if (result.issues && result.issues.length > 0) {
      const issue = result.issues[0]
      if (!issue) return value
      
      const expectedType = extractSchemaType(schema)
      const hint = generateHint(schema, value)
      
      throw new BunliValidationError(
        `Invalid option '${context.option}': ${issue.message}`,
        {
          option: context.option,
          value: value,
          command: context.command,
          expectedType,
          hint
        }
      )
    }
    
    return 'value' in result ? result.value : value
  } catch (error) {
    if (error instanceof BunliValidationError) {
      throw error
    }
    
    // Wrap other errors
    throw new BunliValidationError(
      `Validation failed for option '${context.option}': ${error}`,
      {
        option: context.option,
        value: value,
        command: context.command,
        expectedType: 'unknown',
        hint: 'Check the value format and try again'
      }
    )
  }
}

/**
 * Validate multiple values against their schemas
 */
export async function validateValues(
  values: Record<string, unknown>,
  schemas: Record<string, StandardSchemaV1>,
  command: string
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {}
  const errors: string[] = []
  
  for (const [key, value] of Object.entries(values)) {
    const schema = schemas[key]
    if (!schema) {
      results[key] = value
      continue
    }
    
    try {
      results[key] = await validateValue(value, schema, { option: key, command })
    } catch (error) {
      if (error instanceof BunliValidationError) {
        errors.push(error.toString())
      } else {
        errors.push(`Validation error for ${key}: ${error}`)
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.join('\n')}`)
  }
  
  return results
}

/**
 * Check if a value matches a schema type
 */
export function isValueOfType(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
    case 'array':
      return Array.isArray(value)
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    default:
      return false
  }
}

/**
 * Extract a human-readable type description from a schema
 */
function extractSchemaType(schema: StandardSchemaV1): string {
  if ('type' in schema && typeof schema.type === 'string') {
    return schema.type
  }
  
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
    return 'Use --flag, --flag=true, or --flag=false for boolean options'
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

/**
 * Create a validator function from a schema
 */
export function createValidator(schema: StandardSchemaV1) {
  return async (value: unknown, context: { option: string; command: string }) => {
    return validateValue(value, schema, context)
  }
}

/**
 * Batch validate multiple values
 */
export function createBatchValidator(schemas: Record<string, StandardSchemaV1>) {
  return async (values: Record<string, unknown>, command: string) => {
    return validateValues(values, schemas, command)
  }
}
