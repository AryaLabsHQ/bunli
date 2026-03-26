import { useCallback, useId, useMemo, useState } from 'react'
import { resolve } from 'node:path'
import type { KeyEvent } from '@opentui/core'
import { useScopedKeyboard, createKeyMatcher, useTuiTheme } from '@bunli/runtime/app'
import { listDirectory, formatSize } from './file-picker-utils.js'

export type { FilePickerEntry } from './file-picker-utils.js'
export { listDirectory, formatSize } from './file-picker-utils.js'

export interface FilePickerProps {
  path?: string
  allowFiles?: boolean
  allowDirectories?: boolean
  showHidden?: boolean
  showPermissions?: boolean
  showSize?: boolean
  fileExtensions?: string[]
  height?: number
  cursor?: string
  onSelect?: (entry: import('./file-picker-utils.js').FilePickerEntry) => void
  onAbort?: () => void
  scopeId?: string
  keyboardEnabled?: boolean
}

const filePickerKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  enter: ['enter', 'right', 'l'],
  back: ['backspace', 'left', 'h'],
  toggleHidden: ['.'],
  quit: ['q', 'escape']
})

export function FilePicker({
  path,
  allowFiles = true,
  allowDirectories = false,
  showHidden: initialShowHidden = false,
  showPermissions = false,
  showSize = false,
  fileExtensions,
  height = 15,
  cursor = '>',
  onSelect,
  onAbort,
  scopeId,
  keyboardEnabled = true
}: FilePickerProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `file-picker:${reactScopeId}`

  const [currentPath, setCurrentPath] = useState(() => resolve(path ?? '.'))
  const [cursorIndex, setCursorIndex] = useState(0)
  const [pageOffset, setPageOffset] = useState(0)
  const [showHidden, setShowHidden] = useState(initialShowHidden)

  const entries = useMemo(() => listDirectory(currentPath, {
    showHidden, allowFiles, allowDirectories, fileExtensions
  }), [currentPath, showHidden, fileExtensions, allowFiles, allowDirectories])

  const visibleEntries = useMemo(() => {
    return entries.slice(pageOffset, pageOffset + height)
  }, [entries, pageOffset, height])

  const moveCursor = useCallback((delta: number) => {
    if (entries.length === 0) return

    setCursorIndex(prev => {
      const next = Math.max(0, Math.min(entries.length - 1, prev + delta))

      if (next < pageOffset) {
        setPageOffset(next)
      } else if (next >= pageOffset + height) {
        setPageOffset(next - height + 1)
      }

      return next
    })
  }, [entries.length, pageOffset, height])

  const navigateToDirectory = useCallback((dirPath: string) => {
    setCurrentPath(dirPath)
    setCursorIndex(0)
    setPageOffset(0)
  }, [])

  useScopedKeyboard(
    keyboardScopeId,
    (key: KeyEvent) => {
      if (filePickerKeymap.match('up', key)) {
        moveCursor(-1)
        return true
      }

      if (filePickerKeymap.match('down', key)) {
        moveCursor(1)
        return true
      }

      if (filePickerKeymap.match('enter', key)) {
        const entry = entries[cursorIndex]
        if (!entry) return false

        if (entry.isDirectory) {
          if (allowDirectories) {
            onSelect?.(entry)
          } else {
            navigateToDirectory(entry.path)
          }
        } else if (allowFiles) {
          onSelect?.(entry)
        }
        return true
      }

      if (filePickerKeymap.match('back', key)) {
        const parentPath = resolve(currentPath, '..')
        if (parentPath !== currentPath) {
          navigateToDirectory(parentPath)
        }
        return true
      }

      if (filePickerKeymap.match('toggleHidden', key)) {
        setShowHidden(prev => !prev)
        setCursorIndex(0)
        setPageOffset(0)
        return true
      }

      if (filePickerKeymap.match('quit', key)) {
        onAbort?.()
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  const separatorLength = Math.min(currentPath.length, 40)

  return (
    <box style={{ flexDirection: 'column' }}>
      <text content={currentPath} fg={tokens.accent} />
      <text content={'\u2500'.repeat(separatorLength)} fg={tokens.border} />

      <box style={{ flexDirection: 'column' }}>
        {visibleEntries.map((entry, visIndex) => {
          const globalIndex = pageOffset + visIndex
          const isCursor = globalIndex === cursorIndex
          const prefix = isCursor ? cursor : ' '.repeat(cursor.length)
          const typeIndicator = entry.isDirectory ? '\uD83D\uDCC1 ' : '   '
          const suffix = entry.isDirectory ? '/' : ''
          const sizeStr = showSize && entry.size != null ? ` (${formatSize(entry.size)})` : ''
          const permStr = showPermissions && entry.permissions ? ` [${entry.permissions}]` : ''

          return (
            <text
              key={entry.path}
              content={`${prefix} ${typeIndicator}${entry.name}${suffix}${sizeStr}${permStr}`}
              fg={isCursor ? tokens.accent : entry.isDirectory ? tokens.textPrimary : tokens.textMuted}
            />
          )
        })}
      </box>

      <text content={'\u2191\u2193 navigate  \u2190 parent  \u2192 enter  . hidden  q quit'} fg={tokens.textMuted} />
    </box>
  )
}
