import { z } from 'zod'

/**
 * Converts a StandardSchemaV1 (Zod v4) schema to a JSON Schema object.
 * Strips the `$schema` meta-property.
 */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const result = z.toJSONSchema(schema) as Record<string, unknown>
  delete result.$schema
  return result
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
