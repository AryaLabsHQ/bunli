import { describe, expect, test } from 'bun:test'
import type { KeyEvent } from '@opentui/core'
import { __focusScopeInternalsForTests } from '../src/components/focus-scope.js'

function createKey(name: string) {
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
    }
  } as KeyEvent
}

describe('@bunli/tui focus scope', () => {
  test('dispatches only listeners in the active scope', () => {
    const calls: string[] = []
    const key = createKey('enter')

    const handled = __focusScopeInternalsForTests.dispatchScopedKeyboardEvent(
      key,
      [
        {
          id: 'a',
          scopeId: 'form',
          priority: 0,
          active: true,
          order: 0,
          handler() {
            calls.push('form')
            return false
          }
        },
        {
          id: 'b',
          scopeId: 'modal',
          priority: 0,
          active: true,
          order: 1,
          handler() {
            calls.push('modal')
            return true
          }
        }
      ],
      { activeScopeId: 'modal' }
    )

    expect(handled).toBe(true)
    expect(calls).toEqual(['modal'])
  })

  test('honors priority and stops after consumed handler', () => {
    const calls: string[] = []
    const key = createKey('escape')

    const handled = __focusScopeInternalsForTests.dispatchScopedKeyboardEvent(
      key,
      [
        {
          id: 'low',
          scopeId: 'modal',
          priority: 1,
          active: true,
          order: 0,
          handler() {
            calls.push('low')
            return false
          }
        },
        {
          id: 'high',
          scopeId: 'modal',
          priority: 10,
          active: true,
          order: 1,
          handler() {
            calls.push('high')
            return true
          }
        }
      ],
      { activeScopeId: 'modal' }
    )

    expect(handled).toBe(true)
    expect(calls).toEqual(['high'])
  })

  test('stops dispatch when key propagation is stopped by a listener', () => {
    const calls: string[] = []
    const key = createKey('x')

    const handled = __focusScopeInternalsForTests.dispatchScopedKeyboardEvent(
      key,
      [
        {
          id: 'first',
          scopeId: 'modal',
          priority: 10,
          active: true,
          order: 0,
          handler(event) {
            calls.push('first')
            event.stopPropagation()
            return false
          }
        },
        {
          id: 'second',
          scopeId: 'modal',
          priority: 0,
          active: true,
          order: 1,
          handler() {
            calls.push('second')
            return false
          }
        }
      ],
      { activeScopeId: 'modal' }
    )

    expect(handled).toBe(true)
    expect(calls).toEqual(['first'])
  })
})
