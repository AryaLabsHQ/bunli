import { describe, expect, test } from 'bun:test'
import { __routeStoreInternalsForTests } from '../src/runtime/route-store.js'

describe('@bunli/tui route store', () => {
  test('createInitialRouteState initializes route and history', () => {
    const state = __routeStoreInternalsForTests.createInitialRouteState('overview')
    expect(state).toEqual({
      route: 'overview',
      previousRoute: null,
      history: ['overview']
    })
  })

  test('applyNavigate appends route history', () => {
    const initial = __routeStoreInternalsForTests.createInitialRouteState('overview')
    const next = __routeStoreInternalsForTests.applyNavigate(initial, 'data')
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
    const next = __routeStoreInternalsForTests.applyReplace(initial, 'charts')
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
    const next = __routeStoreInternalsForTests.applyBack(initial)
    expect(next.route).toBe('data')
    expect(next.previousRoute).toBe('charts')
    expect(next.history).toEqual(['overview', 'data'])
  })

  test('canApplyBack reflects whether history has a previous entry', () => {
    const single = __routeStoreInternalsForTests.createInitialRouteState('overview')
    const multiple = {
      route: 'charts',
      previousRoute: 'data',
      history: ['overview', 'data', 'charts']
    }

    expect(__routeStoreInternalsForTests.canApplyBack(single)).toBe(false)
    expect(__routeStoreInternalsForTests.canApplyBack(multiple)).toBe(true)
  })
})
