import { Fragment, createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react'

interface OverlayEntry {
  id: string
  node: ReactNode
  priority: number
}

interface OverlayHostContextValue {
  setOverlay: (entry: OverlayEntry) => void
  removeOverlay: (id: string) => void
}

const OverlayHostContext = createContext<OverlayHostContextValue | null>(null)

export interface OverlayHostProviderProps {
  children: ReactNode
}

export function OverlayHostProvider({ children }: OverlayHostProviderProps) {
  const [entries, setEntries] = useState<Record<string, OverlayEntry>>({})

  const value = useMemo<OverlayHostContextValue>(
    () => ({
      setOverlay(entry) {
        setEntries((prev) => ({ ...prev, [entry.id]: entry }))
      },
      removeOverlay(id) {
        setEntries((prev) => {
          if (!prev[id]) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
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
