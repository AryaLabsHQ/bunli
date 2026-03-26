import { describe, expect, test } from 'bun:test'
import type { KeyEvent } from '@opentui/core'
import { createKeyMatcher, dispatchScopedKeyboardEvent } from '@bunli/runtime/app'

function createKey(name: string, opts?: Partial<KeyEvent>): KeyEvent {
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
    ...opts
  } as KeyEvent
}

const confirmKeymap = createKeyMatcher({
  toggle: ['left', 'right', 'h', 'l', 'tab'],
  affirm: ['y'],
  negate: ['n', 'q'],
  submit: ['enter'],
  abort: ['escape']
})

function createConfirmHandler(state: { selected: boolean; confirmed?: boolean; aborted?: boolean }) {
  return (key: KeyEvent) => {
    if (confirmKeymap.match('toggle', key)) {
      state.selected = !state.selected
      return true
    }
    if (confirmKeymap.match('affirm', key)) {
      state.selected = true
      return true
    }
    if (confirmKeymap.match('negate', key)) {
      state.selected = false
      return true
    }
    if (confirmKeymap.match('submit', key)) {
      state.confirmed = state.selected
      return true
    }
    if (confirmKeymap.match('abort', key)) {
      state.aborted = true
      return true
    }
    return false
  }
}

describe('@bunli/tui confirm', () => {
  test('toggle keys flip selected state', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    for (const keyName of ['left', 'right', 'h', 'l', 'tab']) {
      state.selected = false
      const key = createKey(keyName)
      const handled = handler(key)
      expect(handled).toBe(true)
      expect(state.selected).toBe(true)
    }
  })

  test('toggle flips back to false when already true', () => {
    const state = { selected: true }
    const handler = createConfirmHandler(state)

    const key = createKey('right')
    handler(key)
    expect(state.selected).toBe(false)
  })

  test('affirm key sets selected to true', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    const handled = handler(createKey('y'))
    expect(handled).toBe(true)
    expect(state.selected).toBe(true)
  })

  test('negate key sets selected to false', () => {
    const state = { selected: true }
    const handler = createConfirmHandler(state)

    const handled = handler(createKey('n'))
    expect(handled).toBe(true)
    expect(state.selected).toBe(false)
  })

  test('q key sets selected to false', () => {
    const state = { selected: true }
    const handler = createConfirmHandler(state)

    const handled = handler(createKey('q'))
    expect(handled).toBe(true)
    expect(state.selected).toBe(false)
  })

  test('submit key triggers confirm with current value', () => {
    const state = { selected: true }
    const handler = createConfirmHandler(state)

    handler(createKey('enter'))
    expect(state.confirmed).toBe(true)
  })

  test('submit key confirms false when not selected', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    handler(createKey('enter'))
    expect(state.confirmed).toBe(false)
  })

  test('escape key triggers abort', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    const handled = handler(createKey('escape'))
    expect(handled).toBe(true)
    expect(state.aborted).toBe(true)
  })

  test('unrecognized key is not handled', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    const handled = handler(createKey('x'))
    expect(handled).toBe(false)
    expect(state.selected).toBe(false)
  })

  test('dispatches confirm handler via scoped keyboard', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    const key = createKey('y')
    const handled = dispatchScopedKeyboardEvent(
      key,
      [
        {
          id: 'confirm-listener',
          scopeId: 'confirm:test',
          priority: 0,
          active: true,
          order: 0,
          handler
        }
      ],
      { activeScopeId: 'confirm:test' }
    )

    expect(handled).toBe(true)
    expect(state.selected).toBe(true)
  })

  test('inactive scope does not receive events', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    const key = createKey('y')
    const handled = dispatchScopedKeyboardEvent(
      key,
      [
        {
          id: 'confirm-listener',
          scopeId: 'confirm:test',
          priority: 0,
          active: true,
          order: 0,
          handler
        }
      ],
      { activeScopeId: 'other-scope' }
    )

    expect(handled).toBe(false)
    expect(state.selected).toBe(false)
  })

  test('full toggle-then-submit flow', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    handler(createKey('right'))
    expect(state.selected).toBe(true)

    handler(createKey('enter'))
    expect(state.confirmed).toBe(true)
  })

  test('affirm then negate then submit yields false', () => {
    const state = { selected: false }
    const handler = createConfirmHandler(state)

    handler(createKey('y'))
    expect(state.selected).toBe(true)

    handler(createKey('n'))
    expect(state.selected).toBe(false)

    handler(createKey('enter'))
    expect(state.confirmed).toBe(false)
  })
})
