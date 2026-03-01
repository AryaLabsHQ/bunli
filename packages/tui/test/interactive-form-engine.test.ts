import { describe, test, expect } from 'bun:test'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { toFormErrors, validateFormValues } from '../src/components/form-engine.js'

function createTestSchema(
  validate: (value: unknown) => Promise<{ value?: unknown; issues?: Array<{ message: string; path?: PropertyKey[] }> }>
): StandardSchemaV1 {
  return {
    '~standard': {
      validate
    }
  } as StandardSchemaV1
}

describe('@bunli/tui interactive form engine', () => {
  test('toFormErrors maps issues to field names using path root', () => {
    const errors = toFormErrors([
      { message: 'Name is required', path: ['name'] },
      { message: 'Name must be at least 3 chars', path: ['name'] },
      { message: 'Region is required', path: ['region'] },
      { message: 'Form is invalid' }
    ])

    expect(errors).toEqual({
      name: 'Name is required',
      region: 'Region is required',
      _form: 'Form is invalid'
    })
  })

  test('validateFormValues returns parsed value on success', async () => {
    const schema = createTestSchema(async (value) => ({
      value: {
        ...(value as Record<string, unknown>),
        normalized: true
      }
    }))

    const result = await validateFormValues(schema, { name: 'Arya' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        name: 'Arya',
        normalized: true
      })
      expect(result.errors).toEqual({})
    }
  })

  test('validateFormValues returns structured field errors on failure', async () => {
    const schema = createTestSchema(async () => ({
      issues: [
        { message: 'Name is required', path: ['name'] },
        { message: 'Unsupported combination' }
      ]
    }))

    const result = await validateFormValues(schema, {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual({
        name: 'Name is required',
        _form: 'Unsupported combination'
      })
      expect(result.issues.length).toBe(2)
    }
  })
})
