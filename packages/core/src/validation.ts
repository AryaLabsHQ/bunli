/**
 * Runtime validation utilities for Bunli
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { BunliValidationError, AggregateValidationError, type ValidationIssue } from './errors.js'
import { coerceValue } from './coerce.js'
import { extractSchemaType, generateHint } from './utils/schema-helpers.js'

/**
 * Validate a value against a schema at runtime.
 * Applies coercion for string values before validation.
 */
export async function validateValue(
  value: unknown,
  schema: StandardSchemaV1,
  context: {
    option: string
    command: string
  }
): Promise<unknown> {
  // Apply coercion for string inputs
  if (typeof value === 'string') {
    const coerced = await coerceValue(value, schema)
    if (coerced.coerced) {
      return coerced.value
    }
  }

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
  const issues: ValidationIssue[] = []

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
        issues.push({
          option: error.option,
          message: error.message,
          value: error.value,
          expectedType: error.expectedType,
          hint: error.hint
        })
      } else {
        issues.push({
          option: key,
          message: error instanceof Error ? error.message : `Validation error for ${key}: ${error}`,
          value,
          expectedType: 'unknown'
        })
      }
    }
  }

  if (issues.length > 0) {
    throw new AggregateValidationError({
      message: `Validation failed for command '${command}'`,
      command,
      issues
    })
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
