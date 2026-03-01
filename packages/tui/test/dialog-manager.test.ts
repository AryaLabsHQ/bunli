import { describe, expect, test } from 'bun:test'
import {
  DialogDismissedError,
  __dialogManagerInternalsForTests
} from '../src/components/dialog-manager.js'

describe('@bunli/tui dialog manager', () => {
  test('sortDialogs orders by priority and insertion order', () => {
    const sorted = __dialogManagerInternalsForTests.sortDialogs([
      { id: 'c', priority: 1, order: 1, node: null },
      { id: 'a', priority: 0, order: 3, node: null },
      { id: 'b', priority: 0, order: 2, node: null }
    ])

    expect(sorted.map((entry) => entry.id)).toEqual(['b', 'a', 'c'])
  })

  test('getTopDialog picks highest priority and latest order', () => {
    const top = __dialogManagerInternalsForTests.getTopDialog([
      { id: 'first', priority: 5, order: 0, node: null },
      { id: 'second', priority: 10, order: 1, node: null },
      { id: 'third', priority: 10, order: 2, node: null }
    ])

    expect(top?.id).toBe('third')
  })

  test('DialogDismissedError has stable name/message contract', () => {
    const error = new DialogDismissedError()
    expect(error.name).toBe('DialogDismissedError')
    expect(error.message).toBe('Dialog dismissed')
  })

  test('choose internals compute selectable indices and resolve disabled initial index', () => {
    const options = [
      { label: 'A', value: 'a', disabled: true },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c', disabled: true },
      { label: 'D', value: 'd' }
    ]

    expect(__dialogManagerInternalsForTests.getSelectableIndices(options)).toEqual([1, 3])
    expect(__dialogManagerInternalsForTests.getResolvedChooseIndex(options, 0)).toBe(1)
    expect(__dialogManagerInternalsForTests.getResolvedChooseIndex(options, 3)).toBe(3)
  })

  test('choose internals skip disabled options during adjacent navigation', () => {
    const options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b', disabled: true },
      { label: 'C', value: 'c' }
    ]

    expect(__dialogManagerInternalsForTests.getAdjacentSelectableIndex(options, 0, 1)).toBe(2)
    expect(__dialogManagerInternalsForTests.getAdjacentSelectableIndex(options, 2, 1)).toBe(0)
    expect(__dialogManagerInternalsForTests.getAdjacentSelectableIndex(options, 2, -1)).toBe(0)
  })
})
