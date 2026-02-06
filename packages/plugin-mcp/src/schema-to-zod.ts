/**
 * JSON Schema 7 to Zod Schema converter
 *
 * Converts MCP tool inputSchema (JSON Schema format) to Zod schemas
 * for use in Bunli CLI options.
 */

import { z, type ZodTypeAny } from 'zod'
import type { JSONSchema7 } from './types.js'

/**
 * Options for schema conversion
 */
export interface SchemaConversionOptions {
  /**
   * Whether to make schemas coercive (parse strings to numbers, etc.)
   * Useful for CLI input which is always strings initially
   * @default true
   */
  coerce?: boolean
}

/**
 * Convert JSON Schema to Zod schema
 *
 * Supports:
 * - Primitive types: string, number, integer, boolean
 * - Enums and literals
 * - Arrays with item schemas
 * - Objects (converted to z.record for simplicity)
 * - Constraints: min/max, minLength/maxLength, pattern
 * - Default values
 *
 * @example
 * const zodSchema = jsonSchemaToZodSchema({
 *   type: 'string',
 *   enum: ['low', 'medium', 'high']
 * })
 * // Returns z.enum(['low', 'medium', 'high'])
 */
export function jsonSchemaToZodSchema(
  schema: JSONSchema7 | undefined,
  options: SchemaConversionOptions = {}
): ZodTypeAny {
  const { coerce = true } = options

  // Handle undefined/null schema
  if (!schema || typeof schema !== 'object') {
    return z.unknown()
  }

  // Handle const (literal value)
  if (schema.const !== undefined) {
    return z.literal(schema.const as string | number | boolean)
  }

  // Handle enum
  if (schema.enum && schema.enum.length > 0) {
    // Filter out null values and ensure at least one value
    const enumValues = schema.enum.filter((v): v is string | number => v !== null)
    if (enumValues.length > 0) {
      if (enumValues.every((v): v is string => typeof v === 'string')) {
        return z.enum(enumValues as [string, ...string[]])
      }
      // For mixed or numeric enums, use union of literals
      const literals = enumValues.map(v => z.literal(v))
      if (literals.length === 1) {
        return literals[0]!
      }
      return z.union(literals as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]])
    }
  }

  // Handle anyOf/oneOf (union types)
  if (schema.anyOf && schema.anyOf.length > 0) {
    const schemas = schema.anyOf.map(s => jsonSchemaToZodSchema(s, options))
    if (schemas.length === 1) return schemas[0]!
    return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]])
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const schemas = schema.oneOf.map(s => jsonSchemaToZodSchema(s, options))
    if (schemas.length === 1) return schemas[0]!
    return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]])
  }

  // Handle type-based conversion
  const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type

  switch (schemaType) {
    case 'string':
      return buildStringSchema(schema)

    case 'number':
    case 'integer':
      return buildNumberSchema(schema, coerce)

    case 'boolean':
      return buildBooleanSchema(coerce)

    case 'array':
      return buildArraySchema(schema, options)

    case 'object':
      return buildObjectSchema(schema, options)

    case 'null':
      return z.null()

    default:
      // No type specified - try to infer from other properties
      if (schema.properties) {
        return buildObjectSchema(schema, options)
      }
      if (schema.items) {
        return buildArraySchema(schema, options)
      }
      return z.unknown()
  }
}

/**
 * Build Zod string schema with constraints
 */
function buildStringSchema(schema: JSONSchema7): z.ZodString {
  let zodSchema = z.string()

  // Apply constraints
  if (schema.minLength !== undefined) {
    zodSchema = zodSchema.min(schema.minLength)
  }
  if (schema.maxLength !== undefined) {
    zodSchema = zodSchema.max(schema.maxLength)
  }
  if (schema.pattern) {
    try {
      zodSchema = zodSchema.regex(new RegExp(schema.pattern))
    } catch {
      // Invalid regex, skip
    }
  }

  // Apply format validations
  if (schema.format) {
    switch (schema.format) {
      case 'email':
        zodSchema = zodSchema.email()
        break
      case 'uri':
      case 'url':
        zodSchema = zodSchema.url()
        break
      case 'uuid':
        zodSchema = zodSchema.uuid()
        break
      case 'date-time':
        zodSchema = zodSchema.datetime()
        break
      case 'date':
        zodSchema = zodSchema.date()
        break
      // Other formats: skip validation
    }
  }

  return zodSchema
}

/**
 * Build Zod number schema with constraints
 */
function buildNumberSchema(
  schema: JSONSchema7,
  coerce: boolean,
): z.ZodNumber | z.ZodCoercedNumber {
  let zodSchema = coerce ? z.coerce.number() : z.number()

  // Integer constraint
  if (schema.type === 'integer' || (Array.isArray(schema.type) && schema.type.includes('integer'))) {
    zodSchema = zodSchema.int()
  }

  // Apply constraints
  if (schema.minimum !== undefined) {
    zodSchema = zodSchema.min(schema.minimum)
  }
  if (schema.maximum !== undefined) {
    zodSchema = zodSchema.max(schema.maximum)
  }
  if (schema.exclusiveMinimum !== undefined) {
    zodSchema = zodSchema.gt(schema.exclusiveMinimum)
  }
  if (schema.exclusiveMaximum !== undefined) {
    zodSchema = zodSchema.lt(schema.exclusiveMaximum)
  }
  if (schema.multipleOf !== undefined) {
    zodSchema = zodSchema.multipleOf(schema.multipleOf)
  }

  return zodSchema
}

/**
 * Build Zod boolean schema
 */
function buildBooleanSchema(coerce: boolean): z.ZodBoolean {
  // For CLI, we often want to coerce string 'true'/'false' to boolean
  // But z.coerce.boolean() converts any truthy value, which may not be desired
  // Keep it simple for now
  return z.boolean()
}

/**
 * Build Zod array schema
 */
function buildArraySchema(schema: JSONSchema7, options: SchemaConversionOptions): ZodTypeAny {
  const itemSchema = schema.items
    ? Array.isArray(schema.items)
      ? jsonSchemaToZodSchema(schema.items[0], options) // Tuple - take first for simplicity
      : jsonSchemaToZodSchema(schema.items, options)
    : z.unknown()

  let zodSchema = z.array(itemSchema)

  // Apply constraints
  if (schema.minItems !== undefined) {
    zodSchema = zodSchema.min(schema.minItems)
  }
  if (schema.maxItems !== undefined) {
    zodSchema = zodSchema.max(schema.maxItems)
  }

  return zodSchema
}

/**
 * Build Zod object schema
 *
 * For nested objects in MCP tools, we use z.record for simplicity.
 * Full object schemas with required/optional fields are handled at the
 * top level by the converter.
 */
function buildObjectSchema(schema: JSONSchema7, options: SchemaConversionOptions): ZodTypeAny {
  // For nested objects without properties, use record
  if (!schema.properties) {
    // Zod v4 requires an explicit key schema for record().
    return z.record(z.string(), z.unknown())
  }

  // Build object shape
  const shape: Record<string, ZodTypeAny> = {}
  const requiredFields = new Set(schema.required || [])

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    let propZodSchema = jsonSchemaToZodSchema(propSchema, options)

    // Apply default if present
    if (propSchema.default !== undefined) {
      propZodSchema = propZodSchema.default(propSchema.default)
    }

    // Make optional if not required
    if (!requiredFields.has(propName)) {
      propZodSchema = propZodSchema.optional()
    }

    shape[propName] = propZodSchema
  }

  return z.object(shape)
}

/**
 * Extract metadata from JSON Schema for codegen
 *
 * Returns information useful for generating TypeScript types
 * and completion hints.
 */
export interface SchemaMetadata {
  type: string
  description?: string
  enumValues?: Array<string | number>
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  isArray?: boolean
  itemType?: string
  hasDefault?: boolean
  default?: unknown
}

export function extractSchemaMetadata(schema: JSONSchema7 | undefined): SchemaMetadata {
  if (!schema) {
    return { type: 'unknown' }
  }

  const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type
  const metadata: SchemaMetadata = {
    type: schemaType || 'unknown',
    description: schema.description,
    hasDefault: schema.default !== undefined,
    default: schema.default
  }

  // Extract enum values
  if (schema.enum) {
    metadata.enumValues = schema.enum.filter((v): v is string | number =>
      typeof v === 'string' || typeof v === 'number'
    )
  }

  // Extract constraints
  if (schema.minimum !== undefined) metadata.minimum = schema.minimum
  if (schema.maximum !== undefined) metadata.maximum = schema.maximum
  if (schema.minLength !== undefined) metadata.minLength = schema.minLength
  if (schema.maxLength !== undefined) metadata.maxLength = schema.maxLength
  if (schema.pattern) metadata.pattern = schema.pattern
  if (schema.format) metadata.format = schema.format

  // Array info
  if (schemaType === 'array') {
    metadata.isArray = true
    if (schema.items && !Array.isArray(schema.items)) {
      const itemType = Array.isArray(schema.items.type) ? schema.items.type[0] : schema.items.type
      metadata.itemType = itemType || 'unknown'
    }
  }

  return metadata
}
