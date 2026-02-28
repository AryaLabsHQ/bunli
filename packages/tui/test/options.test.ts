import { describe, test, expect } from 'bun:test'
import { getUseAlternateScreen, resolveOpenTuiRendererOptions } from '../src/options.js'

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

  test('bufferMode has precedence over legacy useAlternateScreen', () => {
    expect(getUseAlternateScreen({ bufferMode: 'standard', useAlternateScreen: true })).toBe(false)
    expect(getUseAlternateScreen({ bufferMode: 'alternate', useAlternateScreen: false })).toBe(true)
  })

  test('resolveOpenTuiRendererOptions keeps defaults when values are undefined', () => {
    expect(
      resolveOpenTuiRendererOptions({
        exitOnCtrlC: undefined,
        targetFps: undefined,
        enableMouseMovement: undefined,
        useMouse: undefined
      })
    ).toMatchObject({
      exitOnCtrlC: true,
      targetFps: 30,
      enableMouseMovement: true,
      useMouse: false
    })
  })

  test('resolveOpenTuiRendererOptions resolves useAlternateScreen from bufferMode', () => {
    expect(resolveOpenTuiRendererOptions({ bufferMode: 'standard', useAlternateScreen: true }).useAlternateScreen).toBe(false)
    expect(resolveOpenTuiRendererOptions({ bufferMode: 'alternate', useAlternateScreen: false }).useAlternateScreen).toBe(true)
  })
})
