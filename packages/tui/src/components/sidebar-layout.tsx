import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTuiTheme } from '@bunli/runtime/app'
import { useTerminalDimensions } from '@opentui/react'

export type SidebarLayoutMode = 'auto' | 'wide' | 'medium' | 'narrow'
export type SidebarLayoutResolvedMode = Exclude<SidebarLayoutMode, 'auto'>
export type SidebarLayoutPane = 'sidebar' | 'content' | 'inspector'

export interface SidebarLayoutPaneLabels {
  sidebar: string
  content: string
  inspector?: string
}

export interface SidebarLayoutProps {
  header?: ReactNode
  status?: ReactNode
  sidebar: ReactNode
  content: ReactNode
  inspector?: ReactNode
  mode?: SidebarLayoutMode
  activePane?: SidebarLayoutPane
  defaultActivePane?: SidebarLayoutPane
  onActivePaneChange?: (pane: SidebarLayoutPane) => void
  paneLabels?: SidebarLayoutPaneLabels
  sidebarWidth?: number
  inspectorWidth?: number
  wideMinWidth?: number
  mediumMinWidth?: number
  gap?: number
  height?: number | `${number}%` | 'auto'
}

export function resolveSidebarLayoutMode(
  terminalWidth: number,
  mode: SidebarLayoutMode,
  breakpoints: { mediumMinWidth: number; wideMinWidth: number }
): SidebarLayoutResolvedMode {
  if (mode !== 'auto') return mode
  if (terminalWidth >= breakpoints.wideMinWidth) return 'wide'
  if (terminalWidth >= breakpoints.mediumMinWidth) return 'medium'
  return 'narrow'
}

function buildPaneOrder(inspector?: ReactNode): SidebarLayoutPane[] {
  return inspector ? ['sidebar', 'content', 'inspector'] : ['sidebar', 'content']
}

export function SidebarLayout({
  header,
  status,
  sidebar,
  content,
  inspector,
  mode = 'auto',
  activePane,
  defaultActivePane = 'content',
  onActivePaneChange,
  paneLabels,
  sidebarWidth = 28,
  inspectorWidth = 38,
  wideMinWidth = 132,
  mediumMinWidth = 100,
  gap = 2,
  height = '100%'
}: SidebarLayoutProps) {
  const { width: terminalWidth = 140 } = useTerminalDimensions()
  const { tokens } = useTuiTheme()
  const resolvedMode = resolveSidebarLayoutMode(terminalWidth, mode, {
    mediumMinWidth,
    wideMinWidth
  })
  const paneOrder = useMemo(() => buildPaneOrder(inspector), [inspector])
  const [internalActivePane, setInternalActivePane] = useState<SidebarLayoutPane>(defaultActivePane)
  const currentActivePane = paneOrder.includes(activePane ?? internalActivePane)
    ? (activePane ?? internalActivePane)
    : paneOrder[0] ?? 'content'

  useEffect(() => {
    if (!paneOrder.includes(currentActivePane)) {
      const nextPane = paneOrder[0] ?? 'content'
      if (activePane === undefined) {
        setInternalActivePane(nextPane)
      }
      onActivePaneChange?.(nextPane)
    }
  }, [activePane, currentActivePane, onActivePaneChange, paneOrder])

  const setPane = (pane: SidebarLayoutPane) => {
    if (!paneOrder.includes(pane)) return
    if (activePane === undefined) {
      setInternalActivePane(pane)
    }
    onActivePaneChange?.(pane)
  }

  const selectorRow = (panes: SidebarLayoutPane[], selectedPane: SidebarLayoutPane = currentActivePane) => (
    <box
      paddingLeft={1}
      paddingRight={1}
      style={{ flexDirection: 'row', gap: 2, justifyContent: 'space-between' }}
    >
      {panes.map((pane) => {
        const label = pane === 'sidebar'
          ? paneLabels?.sidebar ?? 'Browse'
          : pane === 'content'
            ? paneLabels?.content ?? 'Preview'
            : paneLabels?.inspector ?? 'Info'
        const selected = pane === selectedPane

        return (
          <text
            key={pane}
            content={selected ? `[${label}]` : label}
            fg={selected ? tokens.accent : tokens.textMuted}
            onMouseDown={() => setPane(pane)}
          />
        )
      })}
    </box>
  )

  const renderNarrowSelector = resolvedMode === 'narrow'
    ? (
      selectorRow(paneOrder)
    )
    : null

  const mainBody = (() => {
    if (resolvedMode === 'wide') {
      return (
        <box style={{ flexDirection: 'row', gap, flexGrow: 1, height: '100%' }}>
          <box width={sidebarWidth} height='100%'>{sidebar}</box>
          <box style={{ flexGrow: 1 }} height='100%'>{content}</box>
          {inspector ? <box width={inspectorWidth} height='100%'>{inspector}</box> : null}
        </box>
      )
    }

    if (resolvedMode === 'medium') {
      const sidePane = currentActivePane === 'inspector' && inspector ? inspector : content
      return (
        <box style={{ flexDirection: 'row', gap, flexGrow: 1, height: '100%' }}>
          <box width={sidebarWidth} height='100%'>{sidebar}</box>
          <box style={{ flexDirection: 'column', gap: 1, flexGrow: 1 }} height='100%'>
            {inspector
              ? selectorRow(['content', 'inspector'], currentActivePane === 'inspector' ? 'inspector' : 'content')
              : null}
            <box style={{ flexGrow: 1 }} height='100%'>{sidePane}</box>
          </box>
        </box>
      )
    }

    const narrowPane = currentActivePane === 'sidebar'
      ? sidebar
      : currentActivePane === 'inspector' && inspector
        ? inspector
        : content

    return (
      <box style={{ flexDirection: 'column', gap: 1, flexGrow: 1, height: '100%' }}>
        {renderNarrowSelector}
        <box style={{ flexGrow: 1 }} height='100%'>
          {narrowPane}
        </box>
      </box>
    )
  })()

  return (
    <box height={height} style={{ flexDirection: 'column', gap: 1 }}>
      {header}
      <box style={{ flexDirection: 'column', gap: 1, flexGrow: 1 }}>
        {mainBody}
      </box>
      {status}
    </box>
  )
}
