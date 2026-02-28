import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { useScopedKeyboard } from './focus-scope.js'
import { createKeyMatcher } from './keymap.js'
import { Modal } from './modal.js'
import { OverlayPortal } from './overlay-host.js'
import { useTuiTheme } from './theme.js'

type DialogController = {
  reject: (reason?: unknown) => void
}

interface DialogEntry {
  id: string
  order: number
  priority: number
  node: ReactNode
}

export interface DialogOpenOptions {
  id?: string
  priority?: number
}

export interface DialogRenderContext<TResult> {
  id: string
  resolve: (value: TResult) => void
  reject: (reason?: unknown) => void
  close: () => void
  replace: (node: ReactNode) => void
}

export class DialogDismissedError extends Error {
  constructor(message = 'Dialog dismissed') {
    super(message)
    this.name = 'DialogDismissedError'
  }
}

export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  defaultValue?: boolean
  priority?: number
}

export interface ChooseDialogOption<TValue> {
  label: string
  value: TValue
  hint?: string
  disabled?: boolean
  section?: string
}

export interface ChooseDialogOptions<TValue> {
  title: string
  message?: string
  options: Array<ChooseDialogOption<TValue>>
  initialIndex?: number
  priority?: number
}

export interface DialogManager {
  openDialog<TResult>(
    render: (context: DialogRenderContext<TResult>) => ReactNode,
    options?: DialogOpenOptions
  ): Promise<TResult>
  closeDialog(id: string, reason?: unknown): void
  replaceDialog(id: string, node: ReactNode): void
  clearDialogs(reason?: unknown): void
  confirm(options: ConfirmDialogOptions): Promise<boolean>
  choose<TValue>(options: ChooseDialogOptions<TValue>): Promise<TValue>
  topDialogId: string | null
  dialogCount: number
}

const DialogManagerContext = createContext<DialogManager | null>(null)

function sortDialogs(entries: DialogEntry[]): DialogEntry[] {
  return [...entries].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority
    }
    return left.order - right.order
  })
}

function getTopDialog(entries: DialogEntry[]): DialogEntry | null {
  if (entries.length === 0) return null

  return [...entries].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority
    }
    return right.order - left.order
  })[0] ?? null
}

const confirmKeymap = createKeyMatcher({
  chooseTrue: ['left', 'h', 'y'],
  chooseFalse: ['right', 'l', 'n'],
  toggle: ['tab'],
  submit: ['enter']
})

function ManagedConfirmDialog({
  scopeId,
  title,
  message,
  confirmLabel,
  cancelLabel,
  defaultValue,
  onResolve,
  onCancel
}: {
  scopeId: string
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  defaultValue: boolean
  onResolve: (value: boolean) => void
  onCancel: () => void
}) {
  const [selection, setSelection] = useState(defaultValue)
  const selectionRef = useRef(defaultValue)

  const updateSelection = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setSelection((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      selectionRef.current = resolved
      return resolved
    })
  }, [])

  useScopedKeyboard(
    scopeId,
    (key) => {
      if (confirmKeymap.match('chooseTrue', key)) {
        updateSelection(true)
        return true
      }

      if (confirmKeymap.match('chooseFalse', key)) {
        updateSelection(false)
        return true
      }

      if (confirmKeymap.match('toggle', key)) {
        updateSelection((prev) => !prev)
        return true
      }

      if (confirmKeymap.match('submit', key)) {
        onResolve(selectionRef.current)
        return true
      }

      return false
    },
    { priority: 150, active: true }
  )

  return (
    <Modal
      isOpen
      title={title}
      scopeId={scopeId}
      onClose={onCancel}
      closeHint='Tab/Left/Right to change, Enter to confirm, Esc to cancel'
    >
      <text content={message} />
      <text content={`${selection ? '[x]' : '[ ]'} ${confirmLabel}`} />
      <text content={`${selection ? '[ ]' : '[x]'} ${cancelLabel}`} />
    </Modal>
  )
}

const chooseKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  submit: ['enter']
})

function getSelectableIndices<TValue>(options: Array<ChooseDialogOption<TValue>>): number[] {
  const selectable: number[] = []
  for (let index = 0; index < options.length; index += 1) {
    if (!options[index]?.disabled) {
      selectable.push(index)
    }
  }
  return selectable
}

function getResolvedChooseIndex<TValue>(
  options: Array<ChooseDialogOption<TValue>>,
  initialIndex: number
): number {
  if (options.length === 0) return -1

  const selectable = getSelectableIndices(options)
  if (selectable.length === 0) return -1

  const clamped = Math.max(0, Math.min(initialIndex, options.length - 1))
  const exact = options[clamped]
  if (exact && !exact.disabled) {
    return clamped
  }

  const next = selectable.find((index) => index >= clamped)
  if (typeof next === 'number') return next
  return selectable[0] ?? -1
}

function getAdjacentSelectableIndex<TValue>(
  options: Array<ChooseDialogOption<TValue>>,
  currentIndex: number,
  delta: -1 | 1
): number {
  if (options.length === 0) return -1

  const selectable = getSelectableIndices(options)
  if (selectable.length === 0) return -1

  const normalizedCurrent = getResolvedChooseIndex(options, currentIndex)
  const cursor = selectable.indexOf(normalizedCurrent)
  const start = cursor >= 0 ? cursor : 0
  const nextCursor = (start + delta + selectable.length) % selectable.length
  return selectable[nextCursor] ?? normalizedCurrent
}

function ManagedChooseDialog<TValue>({
  scopeId,
  title,
  message,
  options,
  initialIndex,
  onResolve,
  onCancel
}: {
  scopeId: string
  title: string
  message?: string
  options: Array<ChooseDialogOption<TValue>>
  initialIndex: number
  onResolve: (value: TValue) => void
  onCancel: () => void
}) {
  const { tokens } = useTuiTheme()
  const [index, setIndex] = useState(() => {
    return getResolvedChooseIndex(options, initialIndex)
  })
  const indexRef = useRef(index)

  const updateIndex = useCallback((next: number | ((prev: number) => number)) => {
    setIndex((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      indexRef.current = resolved
      return resolved
    })
  }, [])

  useScopedKeyboard(
    scopeId,
    (key) => {
      if (options.length === 0) return false

      if (chooseKeymap.match('up', key)) {
        updateIndex((prev) => getAdjacentSelectableIndex(options, prev, -1))
        return true
      }

      if (chooseKeymap.match('down', key)) {
        updateIndex((prev) => getAdjacentSelectableIndex(options, prev, 1))
        return true
      }

      if (chooseKeymap.match('submit', key)) {
        const option = options[indexRef.current]
        if (!option || option.disabled) return false
        onResolve(option.value)
        return true
      }

      return false
    },
    { priority: 150, active: true }
  )

  return (
    <Modal
      isOpen
      title={title}
      scopeId={scopeId}
      onClose={onCancel}
      closeHint='Up/Down or j/k to navigate, Enter to choose, Esc to cancel'
    >
      {message ? <text content={message} /> : null}
      {options.reduce<ReactNode[]>((nodes, option, optionIndex) => {
        const previousSection = optionIndex > 0 ? options[optionIndex - 1]?.section : undefined
        if (option.section && option.section !== previousSection) {
          nodes.push(
            <text
              key={`${scopeId}-${optionIndex}-section`}
              content={option.section}
              fg={tokens.textMuted}
            />
          )
        }

        const active = optionIndex === index
        const disabled = option.disabled ? ' [disabled]' : ''
        nodes.push(
          <text
            key={`${scopeId}-${optionIndex}`}
            content={`${active ? '>' : ' '} ${option.label}${option.hint ? ` - ${option.hint}` : ''}${disabled}`}
            fg={option.disabled ? tokens.textMuted : active ? tokens.accent : tokens.textPrimary}
          />
        )
        return nodes
      }, [])}
    </Modal>
  )
}

export interface DialogProviderProps {
  children: ReactNode
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [entries, setEntries] = useState<DialogEntry[]>([])
  const controllersRef = useRef<Map<string, DialogController>>(new Map())
  const idCounterRef = useRef(0)
  const orderCounterRef = useRef(0)

  const replaceDialog = useCallback((id: string, node: ReactNode) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, node } : entry)))
  }, [])

  const closeDialog = useCallback((id: string, reason?: unknown) => {
    const controller = controllersRef.current.get(id)
    if (!controller) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id))
      return
    }

    controller.reject(reason ?? new DialogDismissedError())
  }, [])

  const clearDialogs = useCallback((reason?: unknown) => {
    const ids = Array.from(controllersRef.current.keys())
    for (const id of ids) {
      const controller = controllersRef.current.get(id)
      if (!controller) continue
      controller.reject(reason ?? new DialogDismissedError())
    }
  }, [])

  const openDialog = useCallback(
    <TResult,>(
      render: (context: DialogRenderContext<TResult>) => ReactNode,
      options: DialogOpenOptions = {}
    ): Promise<TResult> => {
      const id = options.id ?? `dialog-${idCounterRef.current++}`
      const priority = options.priority ?? 0
      const order = orderCounterRef.current++
      if (controllersRef.current.has(id)) {
        return Promise.reject(new Error(`Dialog with id "${id}" already exists.`))
      }

      return new Promise<TResult>((resolve, reject) => {
        let settled = false

        const settleResolve = (value: TResult) => {
          if (settled) return
          settled = true
          controllersRef.current.delete(id)
          setEntries((prev) => prev.filter((entry) => entry.id !== id))
          resolve(value)
        }

        const settleReject = (reason?: unknown) => {
          if (settled) return
          settled = true
          controllersRef.current.delete(id)
          setEntries((prev) => prev.filter((entry) => entry.id !== id))
          reject(reason ?? new DialogDismissedError())
        }

        const context: DialogRenderContext<TResult> = {
          id,
          resolve: settleResolve,
          reject: settleReject,
          close() {
            settleReject(new DialogDismissedError())
          },
          replace(node) {
            replaceDialog(id, node)
          }
        }

        controllersRef.current.set(id, {
          reject: settleReject
        })

        let node: ReactNode
        try {
          node = render(context)
        } catch (error) {
          settleReject(error)
          return
        }

        setEntries((prev) => [...prev, { id, priority, order, node }])
      })
    },
    [replaceDialog]
  )

  const confirm = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return openDialog<boolean>(
        ({ id, resolve, reject }) => (
          <ManagedConfirmDialog
            scopeId={`confirm:${id}`}
            title={options.title}
            message={options.message}
            confirmLabel={options.confirmLabel ?? 'Confirm'}
            cancelLabel={options.cancelLabel ?? 'Cancel'}
            defaultValue={options.defaultValue ?? true}
            onResolve={resolve}
            onCancel={() => reject(new DialogDismissedError())}
          />
        ),
        { priority: options.priority ?? 100 }
      )
    },
    [openDialog]
  )

  const choose = useCallback(
    <TValue,>(options: ChooseDialogOptions<TValue>): Promise<TValue> => {
      if (options.options.length === 0) {
        return Promise.reject(new Error('Choose dialog requires at least one option.'))
      }
      if (getSelectableIndices(options.options).length === 0) {
        return Promise.reject(new Error('Choose dialog requires at least one enabled option.'))
      }

      return openDialog<TValue>(
        ({ id, resolve, reject }) => (
          <ManagedChooseDialog
            scopeId={`choose:${id}`}
            title={options.title}
            message={options.message}
            options={options.options}
            initialIndex={options.initialIndex ?? 0}
            onResolve={resolve}
            onCancel={() => reject(new DialogDismissedError())}
          />
        ),
        { priority: options.priority ?? 100 }
      )
    },
    [openDialog]
  )

  const sortedEntries = useMemo(() => sortDialogs(entries), [entries])
  const topDialog = useMemo(() => getTopDialog(entries), [entries])

  const value = useMemo<DialogManager>(
    () => ({
      openDialog,
      closeDialog,
      replaceDialog,
      clearDialogs,
      confirm,
      choose,
      topDialogId: topDialog?.id ?? null,
      dialogCount: entries.length
    }),
    [choose, clearDialogs, closeDialog, confirm, entries.length, openDialog, replaceDialog, topDialog?.id]
  )

  return (
    <DialogManagerContext.Provider value={value}>
      {children}
      {sortedEntries.map((entry) => (
        <OverlayPortal key={entry.id} active priority={entry.priority}>
          {entry.node}
        </OverlayPortal>
      ))}
    </DialogManagerContext.Provider>
  )
}

export function useDialogManager(): DialogManager {
  const context = useContext(DialogManagerContext)
  if (!context) {
    throw new Error('Dialog manager is not available. Wrap your app in <DialogProvider>.')
  }
  return context
}

type TestDialogEntry = {
  id: string
  order: number
  priority: number
  node: ReactNode
}

export const __dialogManagerInternalsForTests = {
  sortDialogs(entries: TestDialogEntry[]): TestDialogEntry[] {
    return sortDialogs(entries)
  },
  getTopDialog(entries: TestDialogEntry[]): TestDialogEntry | null {
    return getTopDialog(entries)
  },
  getSelectableIndices,
  getResolvedChooseIndex,
  getAdjacentSelectableIndex
}
