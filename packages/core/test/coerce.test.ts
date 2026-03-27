import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { coerceValue, coerceArray } from '../src/coerce.js'

describe('coerceValue', () => {
  describe('boolean coercion', () => {
    const schema = z.boolean()

    test('coerces "true" to true', async () => {
      const result = await coerceValue('true', schema)
      expect(result).toEqual({ value: true, coerced: true })
    })

    test('coerces "false" to false', async () => {
      const result = await coerceValue('false', schema)
      expect(result).toEqual({ value: false, coerced: true })
    })

    test('coerces "yes" to true (case-insensitive)', async () => {
      const result = await coerceValue('YES', schema)
      expect(result).toEqual({ value: true, coerced: true })
    })

    test('coerces "no" to false (case-insensitive)', async () => {
      const result = await coerceValue('No', schema)
      expect(result).toEqual({ value: false, coerced: true })
    })

    test('coerces "1" to true', async () => {
      const result = await coerceValue('1', schema)
      expect(result).toEqual({ value: true, coerced: true })
    })

    test('coerces "0" to false', async () => {
      const result = await coerceValue('0', schema)
      expect(result).toEqual({ value: false, coerced: true })
    })

    test('coerces "TRUE" (uppercase) to true', async () => {
      const result = await coerceValue('TRUE', schema)
      expect(result).toEqual({ value: true, coerced: true })
    })
  })

  describe('number coercion', () => {
    const schema = z.number()

    test('coerces integer string to number', async () => {
      const result = await coerceValue('42', schema)
      expect(result).toEqual({ value: 42, coerced: true })
    })

    test('coerces float string to number', async () => {
      const result = await coerceValue('3.14', schema)
      expect(result).toEqual({ value: 3.14, coerced: true })
    })

    test('coerces negative number string', async () => {
      const result = await coerceValue('-10', schema)
      expect(result).toEqual({ value: -10, coerced: true })
    })

    test('coerces scientific notation', async () => {
      const result = await coerceValue('1e3', schema)
      expect(result).toEqual({ value: 1000, coerced: true })
    })

    test('does not coerce non-numeric strings', async () => {
      const result = await coerceValue('abc', schema)
      expect(result.coerced).toBe(false)
    })

    test('number schema gets "1" as number, not boolean', async () => {
      // "1" matches boolean first, but z.number() rejects booleans
      const result = await coerceValue('1', schema)
      expect(result).toEqual({ value: 1, coerced: true })
    })
  })

  describe('number with constraints', () => {
    test('coerces "3000" for z.number().min(1)', async () => {
      const schema = z.number().min(1)
      const result = await coerceValue('3000', schema)
      expect(result).toEqual({ value: 3000, coerced: true })
    })

    test('rejects "0" for z.number().min(1)', async () => {
      const schema = z.number().min(1)
      const result = await coerceValue('0', schema)
      // "0" tries boolean (false) -> rejected by number schema
      // Then tries number (0) -> rejected by min(1)
      expect(result.coerced).toBe(false)
    })

    test('preserves constraint error for "70000" with z.number().max(65535)', async () => {
      const schema = z.number().max(65535)
      const result = await coerceValue('70000', schema)
      expect(result.coerced).toBe(false)
      // Must surface the constraint error, NOT "Expected number, received string"
      expect(result.issues).toBeDefined()
      expect(result.issues!.length).toBeGreaterThan(0)
      expect(result.issues![0]!.message).toContain('65535')
    })

    test('preserves constraint error for negative number with z.number().nonnegative()', async () => {
      const schema = z.number().nonnegative()
      const result = await coerceValue('-5', schema)
      expect(result.coerced).toBe(false)
      expect(result.issues).toBeDefined()
      expect(result.issues![0]!.message).not.toContain('received string')
    })
  })

  describe('date coercion', () => {
    const schema = z.date()

    test('coerces ISO date string to Date', async () => {
      const result = await coerceValue('2024-01-15', schema)
      expect(result.coerced).toBe(true)
      expect(result.value).toBeInstanceOf(Date)
    })

    test('does not coerce random strings as dates', async () => {
      const result = await coerceValue('not-a-date', schema)
      expect(result.coerced).toBe(false)
    })
  })

  describe('string fallback', () => {
    const schema = z.string()

    test('passes through strings directly', async () => {
      const result = await coerceValue('hello', schema)
      expect(result).toEqual({ value: 'hello', coerced: true })
    })

    test('passes "true" as string when schema is z.string()', async () => {
      // Boolean coercion tries first but z.string() rejects booleans
      const result = await coerceValue('true', schema)
      expect(result).toEqual({ value: 'true', coerced: true })
    })
  })

  describe('undefined handling', () => {
    test('passes undefined through for optional schemas', async () => {
      const schema = z.string().optional()
      const result = await coerceValue(undefined, schema)
      expect(result.value).toBeUndefined()
    })

    test('fails for required schemas with undefined', async () => {
      const schema = z.string()
      const result = await coerceValue(undefined, schema)
      expect(result.coerced).toBe(false)
    })

    test('uses default for schemas with defaults', async () => {
      const schema = z.string().default('fallback')
      const result = await coerceValue(undefined, schema)
      expect(result.value).toBe('fallback')
    })
  })

  describe('enum coercion', () => {
    test('passes matching string for enum schema', async () => {
      const schema = z.enum(['json', 'yaml', 'md'])
      const result = await coerceValue('json', schema)
      expect(result).toEqual({ value: 'json', coerced: true })
    })

    test('rejects non-matching string for enum schema', async () => {
      const schema = z.enum(['json', 'yaml', 'md'])
      const result = await coerceValue('xml', schema)
      expect(result.coerced).toBe(false)
    })
  })
})

describe('coerceArray', () => {
  test('coerces boolean strings in arrays', async () => {
    const schema = z.array(z.boolean())
    const result = await coerceArray(['true', 'false', 'yes'], schema)
    expect(result).toEqual({ value: [true, false, true], coerced: true })
  })

  test('coerces number strings in arrays', async () => {
    const schema = z.array(z.number())
    const result = await coerceArray(['1', '2', '3'], schema)
    expect(result).toEqual({ value: [1, 2, 3], coerced: true })
  })

  test('falls back to raw values when coercion fails', async () => {
    const schema = z.array(z.string())
    const result = await coerceArray(['hello', 'world'], schema)
    // Coercion tries boolean/number first, fails, then raw validation succeeds
    expect(result.value).toEqual(['hello', 'world'])
  })
})
