import { describe, expect, test } from 'bun:test'
import { Result } from 'better-result'
import { extractSchemaMetadata, jsonSchemaToZodSchema } from '../src/schema-to-zod.js'
import type { JSONSchema7 } from '../src/types.js'

function unwrapSchema(schema: JSONSchema7 | undefined) {
  const converted = jsonSchemaToZodSchema(schema)
  expect(Result.isOk(converted)).toBe(true)
  if (Result.isError(converted)) {
    throw converted.error
  }
  return converted.value
}

describe('jsonSchemaToZodSchema', () => {
  test('converts basic string schema', () => {
    const zodSchema = unwrapSchema({ type: 'string' })
    expect(zodSchema.parse('hello')).toBe('hello')
    expect(() => zodSchema.parse(123)).toThrow()
  })

  test('applies string constraints and formats', () => {
    const constrained = unwrapSchema({
      type: 'string',
      minLength: 3,
      maxLength: 5
    })
    expect(constrained.parse('hello')).toBe('hello')
    expect(() => constrained.parse('hi')).toThrow()
    expect(() => constrained.parse('toolong')).toThrow()

    const email = unwrapSchema({ type: 'string', format: 'email' })
    expect(email.parse('test@example.com')).toBe('test@example.com')
    expect(() => email.parse('not-an-email')).toThrow()
  })

  test('returns Err for malformed regex pattern', () => {
    const converted = jsonSchemaToZodSchema({ type: 'string', pattern: '[' })
    expect(Result.isError(converted)).toBe(true)
  })

  test('converts number/integer with constraints', () => {
    const numberSchema = unwrapSchema({
      type: 'integer',
      minimum: 0,
      maximum: 10
    })
    expect(numberSchema.parse(0)).toBe(0)
    expect(numberSchema.parse('10')).toBe(10)
    expect(() => numberSchema.parse(-1)).toThrow()
    expect(() => numberSchema.parse(11)).toThrow()
    expect(() => numberSchema.parse(1.2)).toThrow()
  })

  test('converts enums and const values', () => {
    const enumSchema = unwrapSchema({
      type: 'string',
      enum: ['low', 'medium', 'high']
    })
    expect(enumSchema.parse('low')).toBe('low')
    expect(() => enumSchema.parse('invalid')).toThrow()

    const constSchema = unwrapSchema({ const: 'fixed' })
    expect(constSchema.parse('fixed')).toBe('fixed')
    expect(() => constSchema.parse('other')).toThrow()
  })

  test('converts unions via anyOf/oneOf', () => {
    const anyOfSchema = unwrapSchema({
      anyOf: [{ type: 'string' }, { type: 'number' }]
    })
    expect(anyOfSchema.parse('hello')).toBe('hello')
    expect(anyOfSchema.parse(42)).toBe(42)

    const oneOfSchema = unwrapSchema({
      oneOf: [{ type: 'string' }, { type: 'boolean' }]
    })
    expect(oneOfSchema.parse('ok')).toBe('ok')
    expect(oneOfSchema.parse(true)).toBe(true)
  })

  test('converts arrays and objects', () => {
    const arraySchema = unwrapSchema({
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    })
    expect(arraySchema.parse(['a'])).toEqual(['a'])
    expect(() => arraySchema.parse([])).toThrow()

    const objectSchema = unwrapSchema({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' }
      },
      required: ['name']
    })
    expect(objectSchema.parse({ name: 'John' })).toEqual({ name: 'John' })
    expect(() => objectSchema.parse({})).toThrow()
  })

  test('handles missing schema by returning unknown', () => {
    const schema = unwrapSchema(undefined)
    expect(schema.parse('anything')).toBe('anything')
  })
})

describe('extractSchemaMetadata', () => {
  test('extracts expected metadata fields', () => {
    const schema: JSONSchema7 = {
      type: 'array',
      description: 'A list',
      items: { type: 'string' },
      minItems: 1,
      default: []
    }

    const meta = extractSchemaMetadata(schema)
    expect(meta.type).toBe('array')
    expect(meta.description).toBe('A list')
    expect(meta.isArray).toBe(true)
    expect(meta.itemType).toBe('string')
    expect(meta.hasDefault).toBe(true)
    expect(meta.default).toEqual([])
  })
})
