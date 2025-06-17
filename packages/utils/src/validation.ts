import type { StandardSchemaV1 } from '@standard-schema/spec'
import { SchemaError } from '@standard-schema/utils'
import { colors } from './colors.js'
import { prompt } from './prompt.js'

/**
 * Validate a value against a schema and throw SchemaError on failure
 */
export async function validate<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  value: unknown
): Promise<StandardSchemaV1.InferOutput<TSchema>> {
  const result = await schema['~standard'].validate(value)
  
  if (result.issues) {
    throw new SchemaError(result.issues)
  }
  
  return result.value as StandardSchemaV1.InferOutput<TSchema>
}


/**
 * Validate multiple fields and return aggregated errors
 */
export async function validateFields<T extends Record<string, StandardSchemaV1>>(
  schemas: T,
  values: Record<string, unknown>
): Promise<{
  [K in keyof T]: StandardSchemaV1.InferOutput<T[K]>
} | { errors: Record<string, string[]> }> {
  const results: Record<string, unknown> = {}
  const errors: Record<string, string[]> = {}
  
  for (const [field, schema] of Object.entries(schemas)) {
    const result = await schema['~standard'].validate(values[field])
    
    if (result.issues) {
      errors[field] = result.issues.map(issue => issue.message)
    } else {
      results[field] = result.value
    }
  }
  
  if (Object.keys(errors).length > 0) {
    return { errors }
  }
  
  return results as any
}