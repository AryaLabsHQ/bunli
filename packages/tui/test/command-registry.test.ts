import { describe, expect, test } from 'bun:test'
import { __commandRegistryInternalsForTests } from '../src/runtime/command-registry.js'

describe('@bunli/tui command registry', () => {
  test('normalizeBinding trims and lowercases keys', () => {
    expect(__commandRegistryInternalsForTests.normalizeBinding(' Ctrl+K ')).toBe('ctrl+k')
    expect(__commandRegistryInternalsForTests.normalizeBinding('Shift+Tab')).toBe('shift+tab')
  })

  test('commandToPaletteItem composes section, hint, and keybind metadata', () => {
    const item = __commandRegistryInternalsForTests.commandToPaletteItem({
      id: 'view.data',
      title: 'Open Data tab',
      section: 'View',
      hint: 'Switch route',
      keybinds: ['2', 'shift+2'],
      run: () => {}
    })

    expect(item.key).toBe('view.data')
    expect(item.label).toBe('Open Data tab')
    expect(item.hint).toBe('View · Switch route · 2, shift+2')
  })

  test('shouldCleanupRegisteredCommand only matches identical registration ownership', () => {
    const currentEntry = { id: 'view.data', registrationId: 8 }

    expect(
      __commandRegistryInternalsForTests.shouldCleanupRegisteredCommand(currentEntry, 'view.data', 8)
    ).toBe(true)
    expect(
      __commandRegistryInternalsForTests.shouldCleanupRegisteredCommand(currentEntry, 'view.data', 9)
    ).toBe(false)
    expect(
      __commandRegistryInternalsForTests.shouldCleanupRegisteredCommand(currentEntry, 'view.charts', 8)
    ).toBe(false)
  })
})
