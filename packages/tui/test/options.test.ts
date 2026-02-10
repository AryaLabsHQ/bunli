import { describe, test, expect } from 'bun:test'
import { getUseAlternateScreen } from '../src/options.js'

describe('@bunli/tui renderer options', () => {
  test('bufferMode alternate maps to useAlternateScreen=true', () => {
    expect(getUseAlternateScreen({ bufferMode: 'alternate' })).toBe(true)
  })

  test('bufferMode standard maps to useAlternateScreen=false', () => {
    expect(getUseAlternateScreen({ bufferMode: 'standard' })).toBe(false)
  })

  test('defaults to alternate when not specified', () => {
    expect(getUseAlternateScreen(undefined)).toBe(true)
    expect(getUseAlternateScreen({})).toBe(true)
  })
})

