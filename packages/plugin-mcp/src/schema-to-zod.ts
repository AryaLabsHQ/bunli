/**
 * JSON Schema 7 to Zod Schema converter
 *
 * Converts MCP tool inputSchema (JSON Schema format) to Zod schemas
 * for use in Bunli CLI options.
 */

import { Result } from 'better-result'
import { z, type ZodTypeAny } from 'zod'
import { SchemaConversionError } from './errors.js'
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
 * - Objects
 * - Constraints: min/max, minLength/maxLength, pattern
 * - Default values
 *
 * Returns `Err<SchemaConversionError>` for invalid runtime schema values
 * (for example, malformed regex patterns).
 */
export function jsonSchemaToZodSchema(
  schema: JSONSchema7 | undefined,
  options: SchemaConversionOptions = {}
): Result<ZodTypeAny, SchemaConversionError> {
  return convertSchema(schema, options, '$')
}

function convertSchema(
  schema: JSONSchema7 | undefined,
  options: SchemaConversionOptions,
  path: string
): Result<ZodTypeAny, SchemaConversionError> {
  const { coerce = true } = options

  // Handle undefined/null schema
  if (!schema || typeof schema !== 'object') {
    return Result.ok(z.unknown())
  }

  // Handle const (literal value)
  if (schema.const !== undefined) {
    return Result.ok(z.literal(schema.const as string | number | boolean))
  }

  // Handle enum
  if (schema.enum && schema.enum.length > 0) {
    // Filter out null values and ensure at least one value
    const enumValues = schema.enum.filter((v): v is string | number => v !== null)
    if (enumValues.length > 0) {
      if (enumValues.every((v): v is string => typeof v === 'string')) {
        return Result.ok(z.enum(enumValues as [string, ...string[]]))
      }

      const literals = enumValues.map(v => z.literal(v))
      return unionFromSchemas(literals, path)
    }
  }

  // Handle anyOf/oneOf (union types)
  if (schema.anyOf && schema.anyOf.length > 0) {
    const schemas = mapSchemas(schema.anyOf, options, `${path}.anyOf`)
    if (Result.isError(schemas)) {
      return schemas
    }
    return unionFromSchemas(schemas.value, `${path}.anyOf`)
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const schemas = mapSchemas(schema.oneOf, options, `${path}.oneOf`)
    if (Result.isError(schemas)) {
      return schemas
    }
    return unionFromSchemas(schemas.value, `${path}.oneOf`)
  }

  // Handle type-based conversion
  const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type

  switch (schemaType) {
    case 'string':
      return buildStringSchema(schema, path)

    case 'number':
    case 'integer':
      return Result.ok(buildNumberSchema(schema, coerce))

    case 'boolean':
      return Result.ok(buildBooleanSchema())

    case 'array':
      return buildArraySchema(schema, options, path)

    case 'object':
      return buildObjectSchema(schema, options, path)

    case 'null':
      return Result.ok(z.null())

    default:
      // No type specified - try to infer from other properties
      if (schema.properties) {
        return buildObjectSchema(schema, options, path)
      }
      if (schema.items) {
        return buildArraySchema(schema, options, path)
      }
      return Result.ok(z.unknown())
  }
}

/**
 * Build Zod string schema with constraints
 */
function buildStringSchema(
  schema: JSONSchema7,
  path: string
): Result<z.ZodString, SchemaConversionError> {
  let zodSchema = z.string()

  // Apply constraints
  if (schema.minLength !== undefined) {
    zodSchema = zodSchema.min(schema.minLength)
  }
  if (schema.maxLength !== undefined) {
    zodSchema = zodSchema.max(schema.maxLength)
  }
  if (schema.pattern) {
    const pattern = schema.pattern
    const regexResult = Result.try({
      try: () => new RegExp(pattern),
      catch: (cause) =>
        new SchemaConversionError({
          path,
          message: `Invalid regex pattern "${pattern}"`,
          cause
        })
    })

    if (Result.isError(regexResult)) {
      return regexResult
    }

    zodSchema = zodSchema.regex(regexResult.value)
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

  return Result.ok(zodSchema)
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
function buildBooleanSchema(): z.ZodBoolean {
  return z.boolean()
}

/**
 * Build Zod array schema
 */
function buildArraySchema(
  schema: JSONSchema7,
  options: SchemaConversionOptions,
  path: string
): Result<ZodTypeAny, SchemaConversionError> {
  let itemSchema: ZodTypeAny = z.unknown()

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      if (schema.items.length > 0) {
        const itemResult = convertSchema(schema.items[0], options, `${path}.items[0]`)
        if (Result.isError(itemResult)) {
          return itemResult
        }
        itemSchema = itemResult.value
      }
    } else {
      const itemResult = convertSchema(schema.items, options, `${path}.items`)
      if (Result.isError(itemResult)) {
        return itemResult
      }
      itemSchema = itemResult.value
    }
  }

  let zodSchema = z.array(itemSchema)

  // Apply constraints
  if (schema.minItems !== undefined) {
    zodSchema = zodSchema.min(schema.minItems)
  }
  if (schema.maxItems !== undefined) {
    zodSchema = zodSchema.max(schema.maxItems)
  }

  return Result.ok(zodSchema)
}

/**
 * Build Zod object schema
 */
function buildObjectSchema(
  schema: JSONSchema7,
  options: SchemaConversionOptions,
  path: string
): Result<ZodTypeAny, SchemaConversionError> {
  // For nested objects without properties, use record
  if (!schema.properties) {
    return Result.ok(z.record(z.string(), z.unknown()))
  }

  // Build object shape
  const shape: Record<string, ZodTypeAny> = {}
  const requiredFields = new Set(schema.required || [])

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const propResult = convertSchema(propSchema, options, `${path}.properties.${propName}`)
    if (Result.isError(propResult)) {
      return propResult
    }

    let propZodSchema = propResult.value

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

  return Result.ok(z.object(shape))
}

function mapSchemas(
  schemas: JSONSchema7[],
  options: SchemaConversionOptions,
  path: string
): Result<ZodTypeAny[], SchemaConversionError> {
  const zodSchemas: ZodTypeAny[] = []

  for (let index = 0; index < schemas.length; index += 1) {
    const converted = convertSchema(schemas[index], options, `${path}[${index}]`)
    if (Result.isError(converted)) {
      return converted
    }
    zodSchemas.push(converted.value)
  }

  return Result.ok(zodSchemas)
}

function unionFromSchemas(
  schemas: ZodTypeAny[],
  path: string
): Result<ZodTypeAny, SchemaConversionError> {
  if (schemas.length === 0) {
    return Result.err(
      new SchemaConversionError({
        path,
        message: `Cannot create union from an empty schema set at ${path}`,
        cause: new Error('Empty schema union')
      })
    )
  }

  if (schemas.length === 1) {
    return Result.ok(schemas[0]!)
  }

  let unionSchema: ZodTypeAny = z.union([schemas[0]!, schemas[1]!])
  for (let index = 2; index < schemas.length; index += 1) {
    unionSchema = z.union([unionSchema, schemas[index]!])
  }

  return Result.ok(unionSchema)
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
