import type { StandardSchemaV1 } from '../types.js'
import { z } from 'zod'

/**
 * Converts a Zod-backed StandardSchemaV1 to JSON Schema.
 * Returns undefined for non-Zod schemas so manifest rendering can fall back to "unknown".
 */
export function toJsonSchema(schema: StandardSchemaV1): Record<string, unknown> | undefined {
  if (!isZodSchema(schema)) return undefined

  const result = z.toJSONSchema(schema) as Record<string, unknown>
  delete result.$schema
  return result
}

function isZodSchema(schema: StandardSchemaV1): schema is z.ZodType {
  return typeof schema === 'object' && schema !== null && '_zod' in schema
}

/**
 * Resolves a simple type name from a JSON Schema property.
 */
export function resolveTypeName(prop: Record<string, unknown> | undefined): string {
  if (!prop) return 'unknown'
  if (prop.enum) {
    const values = prop.enum as unknown[]
    return values.map((v) => String(v)).join(' | ')
  }
  const type = prop.type as string | undefined
  if (type) return type === 'integer' ? 'number' : type
  return 'unknown'
}
