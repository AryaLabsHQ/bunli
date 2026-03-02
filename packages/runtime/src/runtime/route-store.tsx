import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'

interface RouteState {
  route: string
  previousRoute: string | null
  history: string[]
}

interface RouteStoreContextValue extends RouteState {
  navigate: (nextRoute: string) => void
  replace: (nextRoute: string) => void
  back: () => boolean
  reset: () => void
  canGoBack: boolean
}

const RouteStoreContext = createContext<RouteStoreContextValue | null>(null)

export interface RouteStoreProviderProps {
  children: ReactNode
  initialRoute?: string
}

function createInitialRouteState(initialRoute: string): RouteState {
  return {
    route: initialRoute,
    previousRoute: null,
    history: [initialRoute]
  }
}

function applyNavigate(state: RouteState, nextRoute: string): RouteState {
  return {
    route: nextRoute,
    previousRoute: state.route,
    history: [...state.history, nextRoute]
  }
}

function applyReplace(state: RouteState, nextRoute: string): RouteState {
  const nextHistory = state.history.length > 0 ? [...state.history] : [nextRoute]
  if (nextHistory.length === 0) {
    nextHistory.push(nextRoute)
  } else {
    nextHistory[nextHistory.length - 1] = nextRoute
  }
  return {
    route: nextRoute,
    previousRoute: state.route,
    history: nextHistory
  }
}

function applyBack(state: RouteState): RouteState {
  if (!canApplyBack(state)) {
    return state
  }

  const nextHistory = state.history.slice(0, -1)
  const nextRoute = nextHistory[nextHistory.length - 1] ?? state.route

  return {
    route: nextRoute,
    previousRoute: state.route,
    history: nextHistory
  }
}

function canApplyBack(state: RouteState): boolean {
  return state.history.length > 1
}

export function RouteStoreProvider({
  children,
  initialRoute = 'home'
}: RouteStoreProviderProps) {
  const initialRouteRef = useRef(initialRoute)
  const initialState = useMemo(() => createInitialRouteState(initialRoute), [initialRoute])
  const stateRef = useRef(initialState)
  const [state, setState] = useState<RouteState>(initialState)

  const updateState = useCallback((updater: (current: RouteState) => RouteState) => {
    const next = updater(stateRef.current)
    stateRef.current = next
    setState(next)
  }, [])

  const navigate = useCallback((nextRoute: string) => {
    updateState((prev) => applyNavigate(prev, nextRoute))
  }, [updateState])

  const replace = useCallback((nextRoute: string) => {
    updateState((prev) => applyReplace(prev, nextRoute))
  }, [updateState])

  const back = useCallback((): boolean => {
    if (!canApplyBack(stateRef.current)) {
      return false
    }

    updateState((prev) => applyBack(prev))
    return true
  }, [updateState])

  const reset = useCallback(() => {
    updateState(() => createInitialRouteState(initialRouteRef.current))
  }, [updateState])

  const value = useMemo<RouteStoreContextValue>(
    () => ({
      ...state,
      navigate,
      replace,
      back,
      reset,
      canGoBack: state.history.length > 1
    }),
    [back, navigate, replace, reset, state]
  )

  return <RouteStoreContext.Provider value={value}>{children}</RouteStoreContext.Provider>
}

export interface RouteStore {
  route: string
  previousRoute: string | null
  history: string[]
  navigate: (nextRoute: string) => void
  replace: (nextRoute: string) => void
  back: () => boolean
  reset: () => void
  canGoBack: boolean
}

export function useRouteStore(): RouteStore {
  const context = useContext(RouteStoreContext)
  if (!context) {
    throw new Error('Route store is not available. Wrap your app in <RouteStoreProvider>.')
  }
  return context
}

export const __routeStoreInternalsForTests = {
  createInitialRouteState,
  applyNavigate,
  applyReplace,
  applyBack,
  canApplyBack
}
