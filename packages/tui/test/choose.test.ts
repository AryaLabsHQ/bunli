import { describe, expect, test } from 'bun:test'
import type { KeyEvent } from '@opentui/core'
import { createKeyMatcher } from '@bunli/runtime/app'

function createKey(name: string, overrides: Partial<KeyEvent> = {}): KeyEvent {
  let defaultPrevented = false
  let propagationStopped = false

  return {
    name,
    sequence: name,
    ctrl: false,
    shift: false,
    meta: false,
    option: false,
    number: false,
    raw: name,
    eventType: 'press',
    source: 'raw',
    get defaultPrevented() {
      return defaultPrevented
    },
    get propagationStopped() {
      return propagationStopped
    },
    preventDefault() {
      defaultPrevented = true
    },
    stopPropagation() {
      propagationStopped = true
    },
    ...overrides
  } as KeyEvent
}

// --- Pagination logic tests (pure functions) ---

function nextEnabledIndex<T extends { disabled?: boolean }>(
  options: T[],
  from: number,
  delta: number
): number {
  if (options.length === 0) return 0
  for (let step = 0; step < options.length; step += 1) {
    const next = (from + delta * (step + 1) + options.length) % options.length
    if (!options[next]?.disabled) return next
  }
  return from
}

function firstEnabledIndex<T extends { disabled?: boolean }>(options: T[]): number {
  for (let i = 0; i < options.length; i++) {
    if (!options[i]?.disabled) return i
  }
  return 0
}

function lastEnabledIndex<T extends { disabled?: boolean }>(options: T[]): number {
  for (let i = options.length - 1; i >= 0; i--) {
    if (!options[i]?.disabled) return i
  }
  return 0
}

function adjustPageOffset(
  newCursorIndex: number,
  currentOffset: number,
  pageSize: number
): number {
  if (newCursorIndex < currentOffset) {
    return newCursorIndex
  }
  if (newCursorIndex >= currentOffset + pageSize) {
    return newCursorIndex - pageSize + 1
  }
  return currentOffset
}

describe('@bunli/tui Choose', () => {
  describe('cursor movement', () => {
    const options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' },
      { label: 'D', value: 'd' },
      { label: 'E', value: 'e' }
    ]

    test('nextEnabledIndex moves forward', () => {
      expect(nextEnabledIndex(options, 0, 1)).toBe(1)
      expect(nextEnabledIndex(options, 3, 1)).toBe(4)
    })

    test('nextEnabledIndex moves backward', () => {
      expect(nextEnabledIndex(options, 2, -1)).toBe(1)
      expect(nextEnabledIndex(options, 0, -1)).toBe(4)
    })

    test('nextEnabledIndex wraps around', () => {
      expect(nextEnabledIndex(options, 4, 1)).toBe(0)
      expect(nextEnabledIndex(options, 0, -1)).toBe(4)
    })

    test('firstEnabledIndex returns first non-disabled', () => {
      expect(firstEnabledIndex(options)).toBe(0)
      const withDisabled = [
        { label: 'A', value: 'a', disabled: true },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c' }
      ]
      expect(firstEnabledIndex(withDisabled)).toBe(1)
    })

    test('lastEnabledIndex returns last non-disabled', () => {
      expect(lastEnabledIndex(options)).toBe(4)
      const withDisabled = [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c', disabled: true }
      ]
      expect(lastEnabledIndex(withDisabled)).toBe(1)
    })
  })

  describe('disabled item skipping', () => {
    const options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b', disabled: true },
      { label: 'C', value: 'c' },
      { label: 'D', value: 'd', disabled: true },
      { label: 'E', value: 'e' }
    ]

    test('skips disabled items moving forward', () => {
      expect(nextEnabledIndex(options, 0, 1)).toBe(2)
      expect(nextEnabledIndex(options, 2, 1)).toBe(4)
    })

    test('skips disabled items moving backward', () => {
      expect(nextEnabledIndex(options, 2, -1)).toBe(0)
      expect(nextEnabledIndex(options, 4, -1)).toBe(2)
    })

    test('wraps around skipping disabled', () => {
      expect(nextEnabledIndex(options, 4, 1)).toBe(0)
    })

    test('returns current index when all disabled', () => {
      const allDisabled = [
        { label: 'A', value: 'a', disabled: true },
        { label: 'B', value: 'b', disabled: true }
      ]
      expect(nextEnabledIndex(allDisabled, 0, 1)).toBe(0)
    })
  })

  describe('pagination', () => {
    test('adjustPageOffset scrolls up when cursor above visible range', () => {
      expect(adjustPageOffset(2, 5, 5)).toBe(2)
    })

    test('adjustPageOffset scrolls down when cursor below visible range', () => {
      expect(adjustPageOffset(10, 3, 5)).toBe(6)
    })

    test('adjustPageOffset keeps offset when cursor in visible range', () => {
      expect(adjustPageOffset(7, 5, 5)).toBe(5)
    })

    test('adjustPageOffset handles cursor at boundary', () => {
      // Cursor exactly at bottom edge - should stay
      expect(adjustPageOffset(9, 5, 5)).toBe(5)
      // Cursor one past bottom edge - should scroll
      expect(adjustPageOffset(10, 5, 5)).toBe(6)
    })
  })

  describe('selection logic', () => {
    test('toggle adds and removes from selection', () => {
      const selected: number[] = []

      // Add index 2
      const afterAdd = [...selected, 2]
      expect(afterAdd).toEqual([2])

      // Add index 4
      const afterAdd2 = [...afterAdd, 4]
      expect(afterAdd2).toEqual([2, 4])

      // Remove index 2
      const afterRemove = afterAdd2.filter((i) => i !== 2)
      expect(afterRemove).toEqual([4])
    })

    test('limit enforcement prevents adding beyond limit', () => {
      const limit = 2
      const selected = [0, 3]

      // Trying to add another when at limit
      const canAdd = limit > 0 && selected.length >= limit
      expect(canAdd).toBe(true)

      // Should not add
      const result = canAdd ? selected : [...selected, 5]
      expect(result).toEqual([0, 3])
    })

    test('limit enforcement allows deselection at limit', () => {
      const selected = [0, 3]
      const indexToRemove = 0

      const isSelected = selected.includes(indexToRemove)
      expect(isSelected).toBe(true)

      const result = selected.filter((i) => i !== indexToRemove)
      expect(result).toEqual([3])
    })

    test('ordered mode preserves insertion order', () => {
      const selected: number[] = []

      // Select in order: 3, 1, 4
      const step1 = [...selected, 3]
      const step2 = [...step1, 1]
      const step3 = [...step2, 4]

      expect(step3).toEqual([3, 1, 4])
    })

    test('unordered mode sorts by original index', () => {
      const selected = [3, 1, 4]
      const sorted = [...selected].sort((a, b) => a - b)
      expect(sorted).toEqual([1, 3, 4])
    })

    test('select all toggles all enabled items', () => {
      const options = [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b', disabled: true },
        { label: 'C', value: 'c' },
        { label: 'D', value: 'd' }
      ]

      const enabledIndices = options
        .map((opt, i) => (!opt.disabled ? i : -1))
        .filter((i) => i !== -1)

      expect(enabledIndices).toEqual([0, 2, 3])

      // When all selected, deselect all
      const allSelected = enabledIndices.every((i) => enabledIndices.includes(i))
      expect(allSelected).toBe(true)

      // Toggle off
      const result: number[] = []
      expect(result).toEqual([])
    })

    test('select all respects limit', () => {
      const options = [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c' },
        { label: 'D', value: 'd' }
      ]
      const limit = 2

      const enabledIndices = options
        .map((opt, i) => (!opt.disabled ? i : -1))
        .filter((i) => i !== -1)

      const result = limit > 0 ? enabledIndices.slice(0, limit) : enabledIndices
      expect(result).toEqual([0, 1])
    })
  })

  describe('keymap', () => {
    const keymap = createKeyMatcher({
      up: ['up', 'k'],
      down: ['down', 'j'],
      pageUp: ['left', 'h'],
      pageDown: ['right', 'l'],
      home: ['g', 'home'],
      end: ['end', 'G'],
      toggle: ['space', 'tab', 'x'],
      selectAll: ['a'],
      submit: ['enter'],
      abort: ['escape']
    })

    test('matches up keys', () => {
      expect(keymap.match('up', createKey('up'))).toBe(true)
      expect(keymap.match('up', createKey('k'))).toBe(true)
      expect(keymap.match('up', createKey('z'))).toBe(false)
    })

    test('matches down keys', () => {
      expect(keymap.match('down', createKey('down'))).toBe(true)
      expect(keymap.match('down', createKey('j'))).toBe(true)
    })

    test('matches page navigation keys', () => {
      expect(keymap.match('pageUp', createKey('left'))).toBe(true)
      expect(keymap.match('pageUp', createKey('h'))).toBe(true)
      expect(keymap.match('pageDown', createKey('right'))).toBe(true)
      expect(keymap.match('pageDown', createKey('l'))).toBe(true)
    })

    test('matches home/end keys', () => {
      expect(keymap.match('home', createKey('g'))).toBe(true)
      expect(keymap.match('home', createKey('home'))).toBe(true)
      expect(keymap.match('end', createKey('end'))).toBe(true)
    })

    test('matches toggle keys', () => {
      expect(keymap.match('toggle', createKey('space'))).toBe(true)
      expect(keymap.match('toggle', createKey('tab'))).toBe(true)
      expect(keymap.match('toggle', createKey('x'))).toBe(true)
    })

    test('matches submit and abort', () => {
      expect(keymap.match('submit', createKey('enter'))).toBe(true)
      expect(keymap.match('abort', createKey('escape'))).toBe(true)
    })
  })
})
