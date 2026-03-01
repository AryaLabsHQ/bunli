import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { KeyEvent } from '@opentui/core'
import { useKeyboard } from '@opentui/react'

export type ScopedKeyHandler = (key: KeyEvent) => boolean | void

interface ScopedKeyboardListener {
  id: string
  scopeId: string
  priority: number
  active: boolean
  order: number
  handler: ScopedKeyHandler
}

interface FocusScopeContextValue {
  stack: string[]
  activate: (scopeId: string) => void
  deactivate: (scopeId: string) => void
  registerKeyboardListener: (listener: Omit<ScopedKeyboardListener, 'order'>) => void
  unregisterKeyboardListener: (id: string) => void
}

interface DispatchOptions {
  activeScopeId?: string
}

function dispatchScopedKeyboardEvent(
  key: KeyEvent,
  listeners: ScopedKeyboardListener[],
  options: DispatchOptions
): boolean {
  const activeScopeId = options.activeScopeId

  const eligible = listeners
    .filter((listener) => listener.active)
    .filter((listener) => !activeScopeId || listener.scopeId === activeScopeId)
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return right.priority - left.priority
      }
      return right.order - left.order
    })

  for (const listener of eligible) {
    const handled = listener.handler(key) === true
    if (handled) {
      key.stopPropagation?.()
      return true
    }

    if (key.propagationStopped) {
      return true
    }
  }

  return false
}

const FocusScopeContext = createContext<FocusScopeContextValue | null>(null)

export interface FocusScopeProviderProps {
  children: ReactNode
}

export function FocusScopeProvider({ children }: FocusScopeProviderProps) {
  const [stack, setStack] = useState<string[]>([])
  const stackRef = useRef<string[]>([])
  const listenersRef = useRef<Map<string, ScopedKeyboardListener>>(new Map())
  const listenerOrderRef = useRef(0)

  useEffect(() => {
    stackRef.current = stack
  }, [stack])

  useKeyboard((rawKey) => {
    const key = rawKey as KeyEvent
    const activeScopeId = stackRef.current[stackRef.current.length - 1]

    dispatchScopedKeyboardEvent(
      key,
      Array.from(listenersRef.current.values()),
      { activeScopeId }
    )
  })

  const activate = useCallback((scopeId: string) => {
    setStack((prev) => {
      const top = prev[prev.length - 1]
      if (top === scopeId) return prev

      const withoutScope = prev.filter((entry) => entry !== scopeId)
      if (withoutScope.length === 0) {
        return [scopeId]
      }
      return [...withoutScope, scopeId]
    })
  }, [])

  const deactivate = useCallback((scopeId: string) => {
    setStack((prev) => {
      if (!prev.includes(scopeId)) return prev
      return prev.filter((entry) => entry !== scopeId)
    })
  }, [])

  const registerKeyboardListener = useCallback((listener: Omit<ScopedKeyboardListener, 'order'>) => {
    const previous = listenersRef.current.get(listener.id)
    listenersRef.current.set(listener.id, {
      ...listener,
      order: previous?.order ?? listenerOrderRef.current++
    })
  }, [])

  const unregisterKeyboardListener = useCallback((id: string) => {
    listenersRef.current.delete(id)
  }, [])

  const value = useMemo<FocusScopeContextValue>(
    () => ({
      stack,
      activate,
      deactivate,
      registerKeyboardListener,
      unregisterKeyboardListener
    }),
    [activate, deactivate, registerKeyboardListener, stack, unregisterKeyboardListener]
  )

  return <FocusScopeContext.Provider value={value}>{children}</FocusScopeContext.Provider>
}

export interface UseFocusScopeOptions {
  active?: boolean
}

export function useFocusScope(scopeId: string, options: UseFocusScopeOptions = {}) {
  const context = useContext(FocusScopeContext)
  const active = options.active ?? true
  const activate = context?.activate
  const deactivate = context?.deactivate

  useEffect(() => {
    if (!activate || !deactivate || !active) return

    activate(scopeId)
    return () => {
      deactivate(scopeId)
    }
  }, [activate, active, deactivate, scopeId])

  if (!context) {
    return {
      isActive: true,
      hasProvider: false,
      stack: [] as string[]
    }
  }

  const top = context.stack[context.stack.length - 1]

  return {
    isActive: !active || top === scopeId,
    hasProvider: true,
    stack: context.stack
  }
}

export interface UseScopedKeyboardOptions {
  active?: boolean
  priority?: number
}

export function useScopedKeyboard(
  scopeId: string,
  handler: ScopedKeyHandler,
  options: UseScopedKeyboardOptions = {}
) {
  const context = useContext(FocusScopeContext)
  const enabled = options.active ?? true
  const listenerId = useId()
  const handlerRef = useRef(handler)

  handlerRef.current = handler

  const { isActive } = useFocusScope(scopeId, { active: enabled })

  useEffect(() => {
    if (!context) return

    context.registerKeyboardListener({
      id: listenerId,
      scopeId,
      priority: options.priority ?? 0,
      active: enabled && isActive,
      handler: (key) => handlerRef.current(key)
    })

    return () => {
      context.unregisterKeyboardListener(listenerId)
    }
  }, [context, enabled, isActive, listenerId, options.priority, scopeId])

  useKeyboard((rawKey) => {
    if (context) return
    if (!enabled || !isActive) return

    handlerRef.current(rawKey as KeyEvent)
  })

  return isActive
}

export const __focusScopeInternalsForTests = {
  dispatchScopedKeyboardEvent
}
