import { describe, expect, test } from 'bun:test'
import {
  applyBack,
  applyNavigate,
  applyReplace,
  canApplyBack,
  createInitialRouteState
} from '@bunli/runtime/app'

describe('@bunli/tui route store', () => {
  test('createInitialRouteState initializes route and history', () => {
    const state = createInitialRouteState('overview')
    expect(state).toEqual({
      route: 'overview',
      previousRoute: null,
      history: ['overview']
    })
  })

  test('applyNavigate appends route history', () => {
    const initial = createInitialRouteState('overview')
    const next = applyNavigate(initial, 'data')
    expect(next.route).toBe('data')
    expect(next.previousRoute).toBe('overview')
    expect(next.history).toEqual(['overview', 'data'])
  })

  test('applyReplace updates current route without growing history', () => {
    const initial = {
      route: 'data',
      previousRoute: 'overview',
      history: ['overview', 'data']
    }
    const next = applyReplace(initial, 'charts')
    expect(next.route).toBe('charts')
    expect(next.previousRoute).toBe('data')
    expect(next.history).toEqual(['overview', 'charts'])
  })

  test('applyBack returns prior route when history exists', () => {
    const initial = {
      route: 'charts',
      previousRoute: 'data',
      history: ['overview', 'data', 'charts']
    }
    const next = applyBack(initial)
    expect(next.route).toBe('data')
    expect(next.previousRoute).toBe('charts')
    expect(next.history).toEqual(['overview', 'data'])
  })

  test('canApplyBack reflects whether history has a previous entry', () => {
    const single = createInitialRouteState('overview')
    const multiple = {
      route: 'charts',
      previousRoute: 'data',
      history: ['overview', 'data', 'charts']
    }

    expect(canApplyBack(single)).toBe(false)
    expect(canApplyBack(multiple)).toBe(true)
  })
})
