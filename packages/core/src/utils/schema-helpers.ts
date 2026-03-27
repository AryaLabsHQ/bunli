import type { StandardSchemaV1 } from '@standard-schema/spec'

/**
 * Extract a human-readable type description from a schema
 */
export function extractSchemaType(schema: StandardSchemaV1): string {
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
export function generateHint(schema: StandardSchemaV1, value: unknown): string {
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
