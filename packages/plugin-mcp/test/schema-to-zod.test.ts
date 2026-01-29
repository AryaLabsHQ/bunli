import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { jsonSchemaToZodSchema, extractSchemaMetadata } from '../src/schema-to-zod.js'
import type { JSONSchema7 } from '../src/types.js'

describe('jsonSchemaToZodSchema', () => {
  describe('string type', () => {
    test('converts basic string', () => {
      const schema: JSONSchema7 = { type: 'string' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('hello')).toBe('hello')
      expect(() => zodSchema.parse(123)).toThrow()
    })

    test('applies minLength constraint', () => {
      const schema: JSONSchema7 = { type: 'string', minLength: 3 }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('hello')).toBe('hello')
      expect(() => zodSchema.parse('hi')).toThrow()
    })

    test('applies maxLength constraint', () => {
      const schema: JSONSchema7 = { type: 'string', maxLength: 5 }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('hello')).toBe('hello')
      expect(() => zodSchema.parse('hello world')).toThrow()
    })

    test('applies pattern constraint', () => {
      const schema: JSONSchema7 = { type: 'string', pattern: '^[a-z]+$' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('hello')).toBe('hello')
      expect(() => zodSchema.parse('Hello123')).toThrow()
    })

    test('applies email format', () => {
      const schema: JSONSchema7 = { type: 'string', format: 'email' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('test@example.com')).toBe('test@example.com')
      expect(() => zodSchema.parse('not-an-email')).toThrow()
    })

    test('applies url format', () => {
      const schema: JSONSchema7 = { type: 'string', format: 'uri' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('https://example.com')).toBe('https://example.com')
      expect(() => zodSchema.parse('not-a-url')).toThrow()
    })
  })

  describe('number type', () => {
    test('converts basic number with coercion', () => {
      const schema: JSONSchema7 = { type: 'number' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(42)).toBe(42)
      expect(zodSchema.parse('42')).toBe(42) // Coerced from string
      expect(zodSchema.parse(3.14)).toBe(3.14)
    })

    test('converts integer type', () => {
      const schema: JSONSchema7 = { type: 'integer' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(42)).toBe(42)
      expect(() => zodSchema.parse(3.14)).toThrow()
    })

    test('applies minimum constraint', () => {
      const schema: JSONSchema7 = { type: 'number', minimum: 0 }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(0)).toBe(0)
      expect(zodSchema.parse(10)).toBe(10)
      expect(() => zodSchema.parse(-1)).toThrow()
    })

    test('applies maximum constraint', () => {
      const schema: JSONSchema7 = { type: 'number', maximum: 100 }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(100)).toBe(100)
      expect(() => zodSchema.parse(101)).toThrow()
    })

    test('applies min and max together', () => {
      const schema: JSONSchema7 = { type: 'integer', minimum: 0, maximum: 4 }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(0)).toBe(0)
      expect(zodSchema.parse(4)).toBe(4)
      expect(() => zodSchema.parse(-1)).toThrow()
      expect(() => zodSchema.parse(5)).toThrow()
    })
  })

  describe('boolean type', () => {
    test('converts basic boolean', () => {
      const schema: JSONSchema7 = { type: 'boolean' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(true)).toBe(true)
      expect(zodSchema.parse(false)).toBe(false)
    })
  })

  describe('enum type', () => {
    test('converts string enum', () => {
      const schema: JSONSchema7 = {
        type: 'string',
        enum: ['low', 'medium', 'high']
      }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('low')).toBe('low')
      expect(zodSchema.parse('medium')).toBe('medium')
      expect(() => zodSchema.parse('invalid')).toThrow()
    })

    test('converts numeric enum', () => {
      const schema: JSONSchema7 = {
        enum: [0, 1, 2, 3]
      }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(0)).toBe(0)
      expect(zodSchema.parse(3)).toBe(3)
      expect(() => zodSchema.parse(4)).toThrow()
    })
  })

  describe('array type', () => {
    test('converts array of strings', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        items: { type: 'string' }
      }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
      expect(zodSchema.parse([])).toEqual([])
    })

    test('converts array of numbers', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        items: { type: 'number' }
      }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse([1, 2, 3])).toEqual([1, 2, 3])
    })

    test('applies minItems constraint', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        items: { type: 'string' },
        minItems: 1
      }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(['a'])).toEqual(['a'])
      expect(() => zodSchema.parse([])).toThrow()
    })

    test('applies maxItems constraint', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        items: { type: 'string' },
        maxItems: 2
      }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse(['a', 'b'])).toEqual(['a', 'b'])
      expect(() => zodSchema.parse(['a', 'b', 'c'])).toThrow()
    })
  })

  describe('object type', () => {
    test('converts object with properties', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' }
        },
        required: ['name']
      }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse({ name: 'John' })).toEqual({ name: 'John' })
      expect(zodSchema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
      expect(() => zodSchema.parse({})).toThrow() // missing required 'name'
    })

    test('handles object without properties as record', () => {
      const schema: JSONSchema7 = { type: 'object' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse({ foo: 'bar' })).toEqual({ foo: 'bar' })
    })
  })

  describe('const/literal', () => {
    test('converts const to literal', () => {
      const schema: JSONSchema7 = { const: 'fixed-value' }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('fixed-value')).toBe('fixed-value')
      expect(() => zodSchema.parse('other')).toThrow()
    })
  })

  describe('anyOf/oneOf', () => {
    test('converts anyOf to union', () => {
      const schema: JSONSchema7 = {
        anyOf: [
          { type: 'string' },
          { type: 'number' }
        ]
      }
      const zodSchema = jsonSchemaToZodSchema(schema)

      expect(zodSchema.parse('hello')).toBe('hello')
      expect(zodSchema.parse(42)).toBe(42)
    })
  })

  describe('edge cases', () => {
    test('handles undefined schema', () => {
      const zodSchema = jsonSchemaToZodSchema(undefined)
      expect(zodSchema.parse('anything')).toBe('anything')
    })

    test('handles null schema', () => {
      const zodSchema = jsonSchemaToZodSchema(null as any)
      expect(zodSchema.parse('anything')).toBe('anything')
    })

    test('handles unknown type', () => {
      const schema: JSONSchema7 = { type: 'unknown' as any }
      const zodSchema = jsonSchemaToZodSchema(schema)
      expect(zodSchema.parse('anything')).toBe('anything')
    })
  })
})

describe('extractSchemaMetadata', () => {
  test('extracts basic metadata', () => {
    const schema: JSONSchema7 = {
      type: 'string',
      description: 'A test string'
    }
    const meta = extractSchemaMetadata(schema)

    expect(meta.type).toBe('string')
    expect(meta.description).toBe('A test string')
  })

  test('extracts enum values', () => {
    const schema: JSONSchema7 = {
      type: 'string',
      enum: ['a', 'b', 'c']
    }
    const meta = extractSchemaMetadata(schema)

    expect(meta.enumValues).toEqual(['a', 'b', 'c'])
  })

  test('extracts constraints', () => {
    const schema: JSONSchema7 = {
      type: 'integer',
      minimum: 0,
      maximum: 100
    }
    const meta = extractSchemaMetadata(schema)

    expect(meta.minimum).toBe(0)
    expect(meta.maximum).toBe(100)
  })

  test('extracts default value', () => {
    const schema: JSONSchema7 = {
      type: 'boolean',
      default: false
    }
    const meta = extractSchemaMetadata(schema)

    expect(meta.hasDefault).toBe(true)
    expect(meta.default).toBe(false)
  })

  test('extracts array info', () => {
    const schema: JSONSchema7 = {
      type: 'array',
      items: { type: 'string' }
    }
    const meta = extractSchemaMetadata(schema)

    expect(meta.isArray).toBe(true)
    expect(meta.itemType).toBe('string')
  })
})
