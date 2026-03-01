import type { StandardSchemaV1 } from '@standard-schema/spec'
import { SchemaError } from '@standard-schema/utils'
import { Result } from 'better-result'

/**
 * Validate a value against a schema and return Result
 */
export async function validate<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  value: unknown
): Promise<Result<StandardSchemaV1.InferOutput<TSchema>, SchemaError>> {
  const result = await schema['~standard'].validate(value)
  
  if (result.issues) {
    return Result.err(new SchemaError(result.issues))
  }
  
  return Result.ok(result.value as StandardSchemaV1.InferOutput<TSchema>)
}


/**
 * Validate multiple fields and return Result with aggregated errors
 */
export async function validateFields<T extends Record<string, StandardSchemaV1>>(
  schemas: T,
  values: Record<string, unknown>
): Promise<Result<{
  [K in keyof T]: StandardSchemaV1.InferOutput<T[K]>
}, Record<string, string[]>>> {
  const results: Partial<{ [K in keyof T]: StandardSchemaV1.InferOutput<T[K]> }> = {}
  const errors: Record<string, string[]> = {}
  
  for (const [rawField, schema] of Object.entries(schemas)) {
    const field = rawField as keyof T
    const result = await schema['~standard'].validate(values[rawField])
    
    if (result.issues) {
      errors[rawField] = result.issues.map(issue => issue.message)
    } else {
      results[field] = result.value as StandardSchemaV1.InferOutput<T[keyof T]>
    }
  }
  
  if (Object.keys(errors).length > 0) {
    return Result.err(errors)
  }
  
  return Result.ok(results as { [K in keyof T]: StandardSchemaV1.InferOutput<T[K]> })
}
