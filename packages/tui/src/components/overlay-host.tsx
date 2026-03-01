import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { createSyncBatcher, type SyncBatcher } from '../utils/sync-batcher.js'

interface OverlayEntry {
  id: string
  node: ReactNode
  priority: number
}

interface OverlayHostContextValue {
  setOverlay: (entry: OverlayEntry) => void
  removeOverlay: (id: string) => void
}

type OverlayAction =
  | { type: 'set'; entry: OverlayEntry }
  | { type: 'remove'; id: string }

const OverlayHostContext = createContext<OverlayHostContextValue | null>(null)

export interface OverlayHostProviderProps {
  children: ReactNode
}

export function OverlayHostProvider({ children }: OverlayHostProviderProps) {
  const [entries, setEntries] = useState<Record<string, OverlayEntry>>({})
  const batcherRef = useRef<SyncBatcher<OverlayAction> | null>(null)

  useEffect(() => {
    batcherRef.current = createSyncBatcher((actions) => {
      setEntries((prev) => {
        let next = prev
        let changed = false

        for (const action of actions) {
          if (action.type === 'set') {
            const existing = next[action.entry.id]
            if (
              existing &&
              existing.priority === action.entry.priority &&
              existing.node === action.entry.node
            ) {
              continue
            }

            if (!changed) {
              next = { ...next }
              changed = true
            }
            next[action.entry.id] = action.entry
            continue
          }

          if (!next[action.id]) {
            continue
          }

          if (!changed) {
            next = { ...next }
            changed = true
          }
          delete next[action.id]
        }

        return changed ? next : prev
      })
    }, {
      mode: typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'sync' : 'microtask'
    })

    return () => {
      batcherRef.current?.dispose()
      batcherRef.current = null
    }
  }, [])

  const value = useMemo<OverlayHostContextValue>(
    () => ({
      setOverlay(entry) {
        const batcher = batcherRef.current
        if (!batcher) {
          setEntries((prev) => ({ ...prev, [entry.id]: entry }))
          return
        }
        batcher.enqueue({ type: 'set', entry })
      },
      removeOverlay(id) {
        const batcher = batcherRef.current
        if (!batcher) {
          setEntries((prev) => {
            if (!prev[id]) return prev
            const next = { ...prev }
            delete next[id]
            return next
          })
          return
        }
        batcher.enqueue({ type: 'remove', id })
      }
    }),
    []
  )

  const ordered = useMemo(
    () => Object.values(entries).sort((left, right) => left.priority - right.priority),
    [entries]
  )

  return (
    <OverlayHostContext.Provider value={value}>
      {children}
      {ordered.map((entry) => (
        <Fragment key={entry.id}>{entry.node}</Fragment>
      ))}
    </OverlayHostContext.Provider>
  )
}

export interface OverlayPortalProps {
  active?: boolean
  priority?: number
  children: ReactNode
}

export function OverlayPortal({ active = true, priority = 0, children }: OverlayPortalProps) {
  const context = useContext(OverlayHostContext)
  const id = useId()

  useEffect(() => {
    if (!context) return

    if (active) {
      context.setOverlay({ id, node: children, priority })
    } else {
      context.removeOverlay(id)
    }

    return () => {
      context.removeOverlay(id)
    }
  }, [active, children, context, id, priority])

  if (!context) {
    if (!active) return null
    return children
  }

  return null
}
