import { describe, test, expect } from 'bun:test'
import { CANCEL, isCancel, assertNotCancelled, PromptCancelledError } from '../src/prompts/clack.js'

describe('@bunli/utils clack wrappers', () => {
  test('isCancel recognizes the Bunli CANCEL sentinel', () => {
    expect(isCancel(CANCEL)).toBe(true)
    expect(isCancel(Symbol('nope'))).toBe(false)
    expect(isCancel('nope')).toBe(false)
  })

  test('assertNotCancelled returns value when not cancelled', () => {
    expect(assertNotCancelled('ok')).toBe('ok')
    expect(assertNotCancelled(false)).toBe(false)
  })

  test('assertNotCancelled throws PromptCancelledError on CANCEL', () => {
    expect(() => assertNotCancelled(CANCEL)).toThrow(PromptCancelledError)
  })
})

