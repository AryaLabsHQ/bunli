import { describe, expect, test } from 'bun:test'
import type { KeyEvent } from '@opentui/core'
import { createKeyMatcher, eventToBinding, matchesKeyBinding } from '../src/components/keymap.js'

function createKey(params: {
  name: string
  sequence?: string
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
  option?: boolean
}) {
  let defaultPrevented = false
  let propagationStopped = false

  return {
    name: params.name,
    sequence: params.sequence ?? params.name,
    ctrl: params.ctrl ?? false,
    shift: params.shift ?? false,
    meta: params.meta ?? false,
    option: params.option ?? false,
    number: false,
    raw: params.sequence ?? params.name,
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

describe('@bunli/tui keymap', () => {
  test('normalizes aliases and modifiers', () => {
    const key = createKey({ name: 'return', ctrl: true })
    expect(eventToBinding(key)).toBe('ctrl+enter')
    expect(matchesKeyBinding(key, 'ctrl+enter')).toBe(true)
  })

  test('matches shift+tab and vim aliases in one action', () => {
    const matcher = createKeyMatcher({
      previous: ['shift+tab', 'k']
    })

    expect(matcher.match('previous', createKey({ name: 'tab', shift: true }))).toBe(true)
    expect(matcher.match('previous', createKey({ name: 'k' }))).toBe(true)
    expect(matcher.match('previous', createKey({ name: 'j' }))).toBe(false)
  })
})
