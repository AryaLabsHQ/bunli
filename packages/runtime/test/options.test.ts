import { describe, expect, test } from 'bun:test'
import { getUseAlternateScreen, resolveOpenTuiRendererOptions } from '../src/options.js'

describe('@bunli/runtime options', () => {
  test('defaults to standard buffer', () => {
    expect(getUseAlternateScreen(undefined)).toBe(false)
  })

  test('maps bufferMode alternate -> useAlternateScreen=true', () => {
    expect(getUseAlternateScreen({ bufferMode: 'alternate' })).toBe(true)
  })

  test('maps bufferMode standard -> useAlternateScreen=false', () => {
    expect(getUseAlternateScreen({ bufferMode: 'standard' })).toBe(false)
  })

  test('resolveOpenTuiRendererOptions sets defaults', () => {
    const resolved = resolveOpenTuiRendererOptions({})
    expect(resolved.exitOnCtrlC).toBe(true)
    expect(resolved.targetFps).toBe(30)
    expect(resolved.enableMouseMovement).toBe(true)
    expect(resolved.useMouse).toBe(false)
    expect(resolved.useAlternateScreen).toBe(false)
  })
})
