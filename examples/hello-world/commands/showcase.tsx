import { defineCommand, option } from '@bunli/core'
import {
  Alert,
  Badge,
  Card,
  CommandPalette,
  Container,
  DataTable,
  Divider,
  EmptyState,
  Grid,
  KeyValueList,
  Menu,
  Modal,
  OverlayPortal,
  Panel,
  Progress,
  SectionHeader,
  Stack,
  Stat,
  Tabs,
  ThemeProvider,
  Toast,
  DialogDismissedError,
  useCommandRegistry,
  useCommandRegistryItems,
  useDialogManager,
  useKeyboard,
  useRenderer,
  useRouteStore,
  useTerminalDimensions
} from '@bunli/tui/interactive'
import { BarChart, LineChart, Sparkline } from '@bunli/tui/charts'
import type { ScrollBoxRenderable } from '@opentui/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'

type ShowcaseRoute = 'overview' | 'data' | 'charts'
type ShowcaseFocusRegion = 'viewport' | 'palette' | 'menu' | 'tabs' | 'table'
const focusOrder: ShowcaseFocusRegion[] = ['viewport', 'palette', 'menu', 'tabs', 'table']

function isShowcaseRoute(route: unknown): route is ShowcaseRoute {
  return route === 'overview' || route === 'data' || route === 'charts'
}

function toKeyBinding(key: { name: string; ctrl?: boolean; alt?: boolean; option?: boolean; shift?: boolean; meta?: boolean }) {
  const modifiers: string[] = []
  if (key.ctrl) modifiers.push('ctrl')
  if (key.alt || key.option) modifiers.push('alt')
  if (key.shift) modifiers.push('shift')
  if (key.meta) modifiers.push('meta')
  modifiers.push(key.name)
  return modifiers.join('+')
}

function isPrintableKey(name: string): boolean {
  return name.length === 1
}

function ShowcaseScreen({ theme }: { theme: 'dark' | 'light' }) {
  const renderer = useRenderer()
  const dialogs = useDialogManager()
  const registry = useCommandRegistry()
  const commandPaletteItems = useCommandRegistryItems()
  const routeStore = useRouteStore()
  const { width: terminalWidth = 120, height: terminalHeight = 40 } = useTerminalDimensions()
  const [showModal, setShowModal] = useState(false)
  const [lastMenuAction, setLastMenuAction] = useState('none')
  const [toast, setToast] = useState<string | null>(null)
  const [paletteSelection, setPaletteSelection] = useState('none')
  const [activeRegion, setActiveRegion] = useState<ShowcaseFocusRegion>('viewport')
  const [pulse, setPulse] = useState(0)
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  const isNarrow = terminalWidth < 110
  const isCompact = terminalWidth < 80
  const isTiny = terminalWidth < 66
  const isUltraWide = terminalWidth >= 180
  const contentWidth = Math.max(24, terminalWidth - 10)
  const layoutWidth = Math.max(24, contentWidth - 2)
  const statsColumns = isTiny ? 1 : terminalWidth < 96 ? 2 : 3
  const topPanelWidth = isNarrow
    ? layoutWidth
    : isUltraWide
      ? Math.max(28, Math.floor((layoutWidth - 4) / 3))
      : Math.max(28, Math.floor((layoutWidth - 2) / 2))
  const panelLineWidth = Math.max(24, topPanelWidth - 6)
  const fullPanelLineWidth = Math.max(24, layoutWidth - 6)
  const tableLineWidth = Math.max(32, layoutWidth - 6)
  const metaLineWidth = Math.max(28, layoutWidth - 6)
  const chartWidth = Math.max(24, Math.floor((tableLineWidth - 26) / 2) * 2)
  const sparklineWidth = Math.max(20, Math.min(96, tableLineWidth - 16))
  const bodyHeight = Math.max(12, terminalHeight - 8)
  const navigate = routeStore.navigate
  const replaceRoute = routeStore.replace
  const goBack = routeStore.back
  const canGoBack = routeStore.canGoBack
  const routeHistoryLength = routeStore.history.length
  const currentRoute = isShowcaseRoute(routeStore.route) ? routeStore.route : 'overview'
  const isOverlayActive = showModal || dialogs.dialogCount > 0
  const keyboardInteractionsEnabled = !isOverlayActive
  const menuKeyboardEnabled = keyboardInteractionsEnabled && activeRegion === 'menu'
  const paletteKeyboardEnabled = keyboardInteractionsEnabled && activeRegion === 'palette'
  const tabsKeyboardEnabled = keyboardInteractionsEnabled && activeRegion === 'tabs'
  const tableKeyboardEnabled = keyboardInteractionsEnabled && activeRegion === 'table' && currentRoute === 'data'
  const badgeLabel = isCompact
    ? `${theme} ${terminalWidth}w`
    : `${theme} · ${terminalWidth}w · ${currentRoute}`

  useEffect(() => {
    if (!isShowcaseRoute(routeStore.route)) {
      replaceRoute('overview')
    }
  }, [replaceRoute, routeStore.route])

  useEffect(() => {
    if (activeRegion === 'table' && currentRoute !== 'data') {
      setActiveRegion('tabs')
    }
  }, [activeRegion, currentRoute])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => {
      setToast(null)
    }, 2400)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((current) => (current + 1) % 64)
    }, 700)
    return () => clearInterval(interval)
  }, [])

  const focusRegion = useCallback((next: ShowcaseFocusRegion) => {
    setActiveRegion(next)
  }, [])

  const cycleFocusRegion = useCallback((delta: 1 | -1) => {
    setActiveRegion((current) => {
      const currentIndex = focusOrder.indexOf(current)
      const start = currentIndex >= 0 ? currentIndex : 0
      const nextIndex = (start + delta + focusOrder.length) % focusOrder.length
      return focusOrder[nextIndex] ?? 'palette'
    })
  }, [])

  const openConfirmDialog = useCallback(() => {
    void (async () => {
      try {
        const confirmed = await dialogs.confirm({
          title: 'Publish release',
          message: 'Ship @bunli/tui changes now?',
          confirmLabel: 'Ship',
          cancelLabel: 'Hold'
        })
        setToast(confirmed ? 'Release confirmed' : 'Release held')
      } catch (error) {
        if (error instanceof DialogDismissedError) {
          setToast('Release dialog dismissed')
        } else {
          setToast(`Dialog error: ${String(error)}`)
        }
      }
    })()
  }, [dialogs])

  const openEnvironmentPicker = useCallback(() => {
    void (async () => {
      try {
        const target = await dialogs.choose({
          title: 'Target environment',
          message: 'Select where to deploy this build:',
          options: [
            { label: 'Development', value: 'dev', hint: 'Safe default', section: 'General' },
            { label: 'Staging', value: 'staging', hint: 'Pre-production', section: 'General' },
            {
              label: 'Production',
              value: 'prod',
              hint: 'Live traffic',
              section: 'Protected',
              disabled: true
            }
          ]
        })
        setToast(`Selected environment: ${target}`)
      } catch (error) {
        if (error instanceof DialogDismissedError) {
          setToast('Environment picker dismissed')
        } else {
          setToast(`Dialog error: ${String(error)}`)
        }
      }
    })()
  }, [dialogs])

  useEffect(() => {
    const unregister = registry.registerCommands([
      {
        id: 'app.quit',
        title: 'Quit showcase',
        section: 'App',
        keybinds: ['ctrl+c'],
        run: () => {
          if (!renderer.isDestroyed) renderer.destroy()
        }
      },
      {
        id: 'view.overview',
        title: 'Open Overview tab',
        section: 'View',
        keybinds: ['alt+1'],
        run: () => navigate('overview')
      },
      {
        id: 'view.data',
        title: 'Open Data tab',
        section: 'View',
        keybinds: ['alt+2'],
        run: () => navigate('data')
      },
      {
        id: 'view.charts',
        title: 'Open Charts tab',
        section: 'View',
        keybinds: ['alt+3'],
        run: () => navigate('charts')
      },
      {
        id: 'view.back',
        title: 'Go back',
        section: 'View',
        keybinds: ['alt+backspace'],
        disabled: !canGoBack,
        run: () => {
          goBack()
        }
      },
      {
        id: 'dialog.modal',
        title: 'Toggle modal',
        section: 'Dialogs',
        keybinds: ['ctrl+m'],
        run: () => {
          setShowModal((prev) => !prev)
        }
      },
      {
        id: 'dialog.confirm',
        title: 'Open confirm dialog',
        section: 'Dialogs',
        keybinds: ['ctrl+y'],
        run: openConfirmDialog
      },
      {
        id: 'dialog.environment',
        title: 'Open environment picker',
        section: 'Dialogs',
        keybinds: ['ctrl+p'],
        run: openEnvironmentPicker
      },
      {
        id: 'feedback.toast',
        title: 'Show toast',
        section: 'Feedback',
        keybinds: ['ctrl+t'],
        run: () => {
          setToast(`Toast at ${new Date().toLocaleTimeString()}`)
        }
      },
      {
        id: 'focus.palette',
        title: 'Focus command palette',
        section: 'Focus',
        keybinds: ['f1'],
        run: () => focusRegion('palette')
      },
      {
        id: 'focus.viewport',
        title: 'Focus viewport',
        section: 'Focus',
        keybinds: ['f5'],
        run: () => focusRegion('viewport')
      },
      {
        id: 'focus.menu',
        title: 'Focus action menu',
        section: 'Focus',
        keybinds: ['f2'],
        run: () => focusRegion('menu')
      },
      {
        id: 'focus.tabs',
        title: 'Focus tabs',
        section: 'Focus',
        keybinds: ['f3'],
        run: () => focusRegion('tabs')
      },
      {
        id: 'focus.table',
        title: 'Focus data table',
        section: 'Focus',
        keybinds: ['f4'],
        run: () => {
          navigate('data')
          focusRegion('table')
        }
      }
    ])

    return () => {
      unregister()
    }
  }, [canGoBack, focusRegion, goBack, navigate, openConfirmDialog, openEnvironmentPicker, registry, renderer])

  useKeyboard((key) => {
    if (key.propagationStopped || isOverlayActive) return

    if (
      key.name === 'pagedown' ||
      (key.ctrl && !key.meta && !key.option && key.name === 'd')
    ) {
      focusRegion('viewport')
      scrollRef.current?.scrollBy(4)
      key.stopPropagation?.()
      return
    }

    if (
      key.name === 'pageup' ||
      (key.ctrl && !key.meta && !key.option && key.name === 'u')
    ) {
      focusRegion('viewport')
      scrollRef.current?.scrollBy(-4)
      key.stopPropagation?.()
      return
    }

    if (!key.ctrl && !key.option && !key.meta && key.name === 'tab') {
      cycleFocusRegion(key.shift ? -1 : 1)
      key.stopPropagation?.()
      return
    }

    const isUnmodifiedPrintable = !key.ctrl && !key.option && !key.meta && isPrintableKey(key.name)
    if (activeRegion === 'palette' && isUnmodifiedPrintable) {
      return
    }

    const normalized = toKeyBinding(key)
    void (async () => {
      const handled = await registry.runKeybinding(normalized)
      if (handled) return
      if (normalized !== key.name) {
        await registry.runKeybinding(key.name)
      }
    })()
  })

  const chartTab = useMemo(
    () => {
      if (isTiny) {
        return (
          <Stack gap={1}>
            <text content='Compact chart view' />
            <Sparkline values={[2, 6, 3, 7, 4, 9, 8]} width={24} />
          </Stack>
        )
      }

      return (
        <Stack gap={1}>
          <BarChart
            series={{
              name: 'Build durations',
              points: [
                { label: 'core', value: 18 },
                { label: 'tui', value: 27 },
                { label: 'docs', value: 9 }
              ]
            }}
            width={chartWidth}
          />
          <LineChart
            series={{
              name: 'Weekly releases',
              points: [
                { value: 1 },
                { value: 2 },
                { value: 1 },
                { value: 3 },
                { value: 4 }
              ]
            }}
            width={sparklineWidth}
          />
          <Sparkline values={[2, 6, 3, 7, 4, 9, 8]} width={sparklineWidth} />
        </Stack>
      )
    },
    [chartWidth, isTiny, sparklineWidth]
  )

  const packageColumns = useMemo(() => {
    if (isTiny) {
      return [
        { key: 'pkg', label: 'Pkg' },
        { key: 'status', label: 'Status' }
      ]
    }

    return [
      { key: 'pkg', label: 'Package' },
      { key: 'version', label: 'Version' },
      { key: 'status', label: 'Status' }
    ]
  }, [isTiny])

  const packageRows = useMemo(
    () => [
      { pkg: isTiny ? 'core' : '@bunli/core', version: '0.6.1', status: 'stable' },
      { pkg: isTiny ? 'tui' : '@bunli/tui', version: '0.4.1', status: 'stable' },
      { pkg: isTiny ? 'utils' : '@bunli/utils', version: '0.4.0', status: isTiny ? 'legacy' : 'deprecated prompts' }
    ],
    [isTiny]
  )

  const keyValueItems = useMemo(
    () => [
      { key: 'terminal', value: `${terminalWidth} cols` },
      { key: 'viewport', value: `${terminalHeight} rows` },
      { key: 'buffer mode', value: 'alternate (fullscreen)' },
      { key: 'focus strategy', value: 'scope stack + overlays' },
      { key: 'active region', value: activeRegion },
      { key: 'prompt owner', value: isTiny ? 'tui/prompt' : '@bunli/tui/prompt' },
      { key: 'legacy clack', value: 'removed' }
    ],
    [activeRegion, isTiny, terminalHeight, terminalWidth]
  )

  const rolloutProgress = 64 + ((pulse % 5) * 7)
  const queueDepth = 7 + (pulse % 4)
  const throughput = 112 + ((pulse % 6) * 3)
  const heroSparklineValues = [18, 21, 19, 24, 26, 23, 27, 30, 28]
  const releasePanelInnerWidth = Math.max(24, layoutWidth - 4)
  const heroPanelWidth = isNarrow
    ? releasePanelInnerWidth
    : Math.max(36, Math.floor((releasePanelInnerWidth - 2) / 2))
  const heroKeyValueWidth = Math.max(24, heroPanelWidth - 10)
  const heroBarChartWidth = Math.max(20, heroPanelWidth - 26)

  return (
    <ThemeProvider theme={theme}>
      <Container border padding={1}>
        <SectionHeader
          title='@bunli/tui showcase'
          trailing={<Badge label={badgeLabel} tone='accent' />}
        />

        <Divider />
        <text
          content={
            isCompact
              ? `focus:${activeRegion} tab • f1/f2/f3/f4/f5 • pgup/pgdn`
              : `Focus: ${activeRegion}. Tab/Shift+Tab cycles regions. F1 palette, F2 menu, F3 tabs, F4 table, F5 viewport. PgUp/PgDn and Ctrl+U/Ctrl+D scroll.`
          }
        />
        <scrollbox
          ref={scrollRef}
          scrollY
          height={bodyHeight}
          focused={keyboardInteractionsEnabled && activeRegion === 'viewport'}
          style={{ borderColor: 'transparent' }}
        >
          <box style={{ flexDirection: 'column', gap: 2, width: layoutWidth }}>
            <Panel
              title='Release Cockpit'
              subtitle='Animated operational snapshot'
              tone='accent'
              emphasis='outline'
            >
              {isNarrow ? (
                <Stack gap={1}>
                  <text content='OpenTUI lets you blend command surfaces, dashboards, and modal workflows in one terminal runtime.' />
                  <Stack direction='row' gap={1}>
                    <Badge tone='accent' label={`mode ${theme}`} />
                    <Badge tone='success' label='live data' />
                    <Badge tone='warning' label={`queue ${queueDepth}`} />
                  </Stack>
                  <Progress value={rolloutProgress} label='Rollout confidence' />
                  <Sparkline values={heroSparklineValues} width={Math.max(24, Math.min(72, layoutWidth - 12))} />
                </Stack>
              ) : (
                <Stack direction='row' gap={2} style={{ width: releasePanelInnerWidth }}>
                  <box width={heroPanelWidth}>
                    <Stack gap={1}>
                      <text content='OpenTUI lets you blend command surfaces, dashboards, and modal workflows in one terminal runtime.' />
                      <Stack direction='row' gap={1}>
                        <Badge tone='accent' label={`mode ${theme}`} />
                        <Badge tone='success' label='live data' />
                        <Badge tone='warning' label={`queue ${queueDepth}`} />
                      </Stack>
                      <KeyValueList
                        items={[
                          { key: 'throughput', value: `${throughput} req/min` },
                          { key: 'active workers', value: `${14 + (pulse % 3)}` },
                          { key: 'focus region', value: activeRegion }
                        ]}
                        maxLineWidth={heroKeyValueWidth}
                      />
                    </Stack>
                  </box>
                  <box width={heroPanelWidth}>
                    <Stack gap={1}>
                      <Progress value={rolloutProgress} label='Rollout confidence' />
                      <BarChart
                        series={{
                          name: 'Latency envelope',
                          points: [
                            { label: 'api', value: 22 + (pulse % 4) },
                            { label: 'queue', value: 15 + (pulse % 3) },
                            { label: 'cache', value: 9 + (pulse % 2) }
                          ]
                        }}
                        width={heroBarChartWidth}
                      />
                    </Stack>
                  </box>
                </Stack>
              )}
            </Panel>

            <Grid columns={statsColumns}>
              <Stat label='Commands' value={registry.commands.length} hint='registered' tone='accent' />
              <Stat label='Pipeline' value='238/238' hint='green builds' tone='success' />
              <Stat label='Incidents' value={pulse % 2} hint='rolling window' tone='warning' />
            </Grid>

            {isUltraWide ? (
              <Stack direction='row' gap={2} style={{ width: layoutWidth }}>
                <box width={topPanelWidth}>
                  <Panel title='Feedback' subtitle='Tone variants'>
                    <Alert tone='success' title='Build' message='All packages built successfully' />
                    <Alert tone='warning' title='Compatibility' message={isTiny ? 'API changes in this release' : 'API is breaking in this release'} />
                  </Panel>
                </box>

                <box width={topPanelWidth}>
                  <Panel title='Menu' subtitle={isCompact ? `focus: ${activeRegion}` : 'Keyboard driven actions'}>
                    <Menu
                      title={activeRegion === 'menu' ? 'Actions (active)' : 'Actions'}
                      items={[
                        { key: 'dialog.confirm', label: 'Release', description: 'Open release confirm' },
                        { key: 'dialog.environment', label: 'Environment', description: 'Pick deployment target' },
                        { key: 'feedback.toast', label: 'Toast', description: isTiny ? 'Show toast' : 'Show feedback toast' }
                      ]}
                      onSelect={(key) => {
                        setLastMenuAction(key)
                        void registry.runCommand(key)
                      }}
                      scopeId='showcase:menu'
                      keyboardEnabled={menuKeyboardEnabled}
                      maxLineWidth={panelLineWidth}
                    />
                    <text content={isCompact ? `menu: ${lastMenuAction}` : `Last menu action: ${lastMenuAction}`} />
                  </Panel>
                </box>

                <box width={topPanelWidth}>
                  <Panel title='Command Palette' subtitle={isCompact ? `focus: ${activeRegion}` : 'Search and run commands'}>
                    <CommandPalette
                      items={commandPaletteItems}
                      onSelect={(key) => {
                        setPaletteSelection(key)
                        void registry.runCommand(key)
                      }}
                      scopeId='showcase:palette'
                      keyboardEnabled={paletteKeyboardEnabled}
                      inputFocused={paletteKeyboardEnabled}
                      maxLineWidth={panelLineWidth}
                    />
                    <text content={isCompact ? `palette: ${paletteSelection}` : `Palette selection: ${paletteSelection}`} />
                  </Panel>
                </box>
              </Stack>
            ) : isNarrow ? (
              <Stack direction='column' gap={2} style={{ width: layoutWidth }}>
                <box width={topPanelWidth}>
                  <Panel title='Feedback' subtitle='Tone variants'>
                    <Alert tone='success' title='Build' message='All packages built successfully' />
                    <Alert tone='warning' title='Compatibility' message={isTiny ? 'API changes in this release' : 'API is breaking in this release'} />
                  </Panel>
                </box>

                <box width={topPanelWidth}>
                  <Panel title='Menu + Palette' subtitle={isCompact ? `focus: ${activeRegion}` : 'Keyboard driven components'}>
                    <Menu
                      title={activeRegion === 'menu' ? 'Actions (active)' : 'Actions'}
                      items={[
                        { key: 'dialog.confirm', label: 'Release', description: 'Open release confirm' },
                        { key: 'dialog.environment', label: 'Environment', description: 'Pick deployment target' },
                        { key: 'feedback.toast', label: 'Toast', description: isTiny ? 'Show toast' : 'Show feedback toast' }
                      ]}
                      onSelect={(key) => {
                        setLastMenuAction(key)
                        void registry.runCommand(key)
                      }}
                      scopeId='showcase:menu'
                      keyboardEnabled={menuKeyboardEnabled}
                      maxLineWidth={panelLineWidth}
                    />
                    <text content={isCompact ? `menu: ${lastMenuAction}` : `Last menu action: ${lastMenuAction}`} />
                    <CommandPalette
                      items={commandPaletteItems}
                      onSelect={(key) => {
                        setPaletteSelection(key)
                        void registry.runCommand(key)
                      }}
                      scopeId='showcase:palette'
                      keyboardEnabled={paletteKeyboardEnabled}
                      inputFocused={paletteKeyboardEnabled}
                      maxLineWidth={panelLineWidth}
                    />
                    <text content={isCompact ? `palette: ${paletteSelection}` : `Palette selection: ${paletteSelection}`} />
                  </Panel>
                </box>
              </Stack>
            ) : (
              <Stack direction='column' gap={2} style={{ width: layoutWidth }}>
                <Stack direction='row' gap={2} style={{ width: layoutWidth }}>
                  <box width={topPanelWidth}>
                    <Panel title='Feedback' subtitle='Tone variants'>
                      <Alert tone='success' title='Build' message='All packages built successfully' />
                      <Alert tone='warning' title='Compatibility' message={isTiny ? 'API changes in this release' : 'API is breaking in this release'} />
                    </Panel>
                  </box>

                  <box width={topPanelWidth}>
                    <Panel title='Menu' subtitle={isCompact ? `focus: ${activeRegion}` : 'Keyboard driven actions'}>
                      <Menu
                        title={activeRegion === 'menu' ? 'Actions (active)' : 'Actions'}
                        items={[
                          { key: 'dialog.confirm', label: 'Release', description: 'Open release confirm' },
                          { key: 'dialog.environment', label: 'Environment', description: 'Pick deployment target' },
                          { key: 'feedback.toast', label: 'Toast', description: isTiny ? 'Show toast' : 'Show feedback toast' }
                        ]}
                        onSelect={(key) => {
                          setLastMenuAction(key)
                          void registry.runCommand(key)
                        }}
                        scopeId='showcase:menu'
                        keyboardEnabled={menuKeyboardEnabled}
                        maxLineWidth={panelLineWidth}
                      />
                      <text content={isCompact ? `menu: ${lastMenuAction}` : `Last menu action: ${lastMenuAction}`} />
                    </Panel>
                  </box>
                </Stack>

                <box width={layoutWidth}>
                  <Panel title='Command Palette' subtitle={isCompact ? `focus: ${activeRegion}` : 'Search and run commands'}>
                    <CommandPalette
                      items={commandPaletteItems}
                      onSelect={(key) => {
                        setPaletteSelection(key)
                        void registry.runCommand(key)
                      }}
                      scopeId='showcase:palette'
                      keyboardEnabled={paletteKeyboardEnabled}
                      inputFocused={paletteKeyboardEnabled}
                      maxLineWidth={fullPanelLineWidth}
                    />
                    <text content={isCompact ? `palette: ${paletteSelection}` : `Palette selection: ${paletteSelection}`} />
                  </Panel>
                </box>
              </Stack>
            )}

            <Tabs
              tabs={[
                {
                  key: 'overview',
                  label: 'Overview',
                  content: (
                    <Stack gap={1}>
                      <text content='Use keyboard commands or palette to drive the app runtime.' />
                      <KeyValueList
                        items={[
                          { key: 'commands', value: commandPaletteItems.length },
                          { key: 'current route', value: currentRoute },
                          { key: 'back stack', value: routeHistoryLength }
                        ]}
                        maxLineWidth={metaLineWidth}
                        fillWidth
                      />
                    </Stack>
                  )
                },
                {
                  key: 'data',
                  label: 'Data',
                  content: (
                    <Stack gap={1}>
                      <DataTable
                        columns={packageColumns}
                        rows={packageRows}
                        scopeId='showcase:table'
                        keyboardEnabled={tableKeyboardEnabled}
                        maxLineWidth={tableLineWidth}
                        fillWidth
                      />
                      <KeyValueList items={keyValueItems} maxLineWidth={metaLineWidth} fillWidth />
                    </Stack>
                  )
                },
                {
                  key: 'charts',
                  label: 'Charts',
                  content: chartTab
                }
              ]}
              activeKey={currentRoute}
              scopeId='showcase:tabs'
              keyboardEnabled={tabsKeyboardEnabled}
              onChange={(key) => navigate((isShowcaseRoute(key) ? key : 'overview'))}
            />

            <Card title={isCompact ? 'Status' : 'Environment Status'} tone='accent' emphasis='outline'>
              <EmptyState
                title='No pending tasks'
                description='Everything is up to date. Trigger a dialog, menu action, or palette command to mutate state.'
                icon='[]'
              />
            </Card>
          </box>
        </scrollbox>

        {toast ? (
          <OverlayPortal active priority={950}>
            <box
              position='absolute'
              bottom={2}
              right={2}
              zIndex={950}
              width={Math.min(64, Math.max(36, terminalWidth - 10))}
            >
              <Toast tone='info' title='Event' message={toast} />
            </box>
          </OverlayPortal>
        ) : null}

        <Modal isOpen={showModal} title='Modal dialog' onClose={() => setShowModal(false)}>
          <text content='This is a simple modal primitive for alternate-buffer interactions.' />
        </Modal>
      </Container>
    </ThemeProvider>
  )
}

const showcaseCommand = defineCommand({
  name: 'showcase' as const,
  description: 'Render a showcase of @bunli/tui interactive components',
  options: {
    theme: option(z.enum(['dark', 'light']).default('dark'), {
      short: 'm',
      description: 'Theme preset'
    })
  },
  render: ({ flags }) => <ShowcaseScreen theme={flags.theme as 'dark' | 'light'} />,
  handler: async ({ colors }) => {
    console.log(colors.bold('Run with --tui to view the interactive showcase'))
    console.log('Example: bun cli.ts showcase --tui')
  }
})

export default showcaseCommand
