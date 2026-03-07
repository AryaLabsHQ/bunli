import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScrollBoxRenderable } from '@opentui/core'
import { useRuntime } from '@bunli/runtime/app'
import {
  Badge,
  Container,
  Divider,
  SectionHeader,
  SidebarLayout,
  Stack,
  ThemeProvider,
  useKeyboard,
  resolveSidebarLayoutMode,
  useTerminalDimensions
} from '@bunli/tui/interactive'
import type { SidebarLayoutPane } from '@bunli/tui/interactive'
import { gallerySections } from '../registry/index.js'
import {
  findCategory,
  findEntryRecord,
  firstSelectionForSection,
  firstStateKey,
  resolveInitialSelection,
  type GalleryEntry,
  type GalleryFocusRegion,
  type GallerySectionId,
  type GalleryTheme,
  type GalleryWidthPreset
} from '../model.js'
import { BrowsePane } from './browse-pane.js'
import { InfoPane } from './info-pane.js'
import { PreviewPane } from './preview-pane.js'

const widthPresetOrder: GalleryWidthPreset[] = ['narrow', 'standard', 'wide']
const focusOrder: GalleryFocusRegion[] = ['sections', 'categories', 'entries', 'preview', 'states']

function cycleValue<T>(values: T[], current: T): T {
  const index = values.indexOf(current)
  const nextIndex = index < 0 ? 0 : (index + 1) % values.length
  return values[nextIndex] ?? current
}

function paneForFocus(region: GalleryFocusRegion): SidebarLayoutPane {
  if (region === 'sections' || region === 'categories') return 'sidebar'
  if (region === 'states') return 'inspector'
  return 'content'
}

function focusForPane(current: GalleryFocusRegion, pane: SidebarLayoutPane): GalleryFocusRegion {
  if (pane === 'sidebar') {
    return current === 'sections' ? 'sections' : 'categories'
  }

  if (pane === 'inspector') {
    return 'states'
  }

  return current === 'entries' ? 'entries' : 'preview'
}

function sidebarWidthForPreset(preset: GalleryWidthPreset) {
  if (preset === 'wide') return 36
  if (preset === 'narrow') return 28
  return 32
}

function inspectorWidthForPreset(preset: GalleryWidthPreset) {
  if (preset === 'wide') return 40
  if (preset === 'narrow') return 32
  return 36
}

function resolvePaneWidths(
  preset: GalleryWidthPreset,
  terminalWidth: number,
  layoutMode: 'wide' | 'medium' | 'narrow'
) {
  const sidebarWidth = sidebarWidthForPreset(preset)
  const inspectorWidth = inspectorWidthForPreset(preset)

  if (layoutMode === 'narrow') {
    const singlePaneWidth = Math.max(36, terminalWidth - 10)
    return {
      sidebarWidth,
      inspectorWidth,
      browseWidth: singlePaneWidth,
      previewWidth: singlePaneWidth,
      infoWidth: singlePaneWidth
    }
  }

  if (layoutMode === 'medium') {
    const mainPaneWidth = Math.max(42, terminalWidth - sidebarWidth - 10)
    return {
      sidebarWidth,
      inspectorWidth,
      browseWidth: sidebarWidth,
      previewWidth: mainPaneWidth,
      infoWidth: mainPaneWidth
    }
  }

  return {
    sidebarWidth,
    inspectorWidth,
    browseWidth: sidebarWidth,
    previewWidth: Math.max(42, terminalWidth - sidebarWidth - inspectorWidth - 14),
    infoWidth: inspectorWidth
  }
}

function fallbackEntry(): GalleryEntry {
  return {
    id: '',
    kind: 'example',
    title: '',
    summary: '',
    usage: [],
    states: [{ key: 'default', label: 'Default' }],
    sourceRefs: [],
    render: () => null
  }
}

export interface GalleryShellProps {
  initialTheme: GalleryTheme
  initialSectionId?: GallerySectionId
  initialEntryId?: string
}

export function GalleryShell({
  initialTheme,
  initialSectionId,
  initialEntryId
}: GalleryShellProps) {
  const runtime = useRuntime()
  const { width: terminalWidth = 140, height: terminalHeight = 42 } = useTerminalDimensions()
  const [theme, setTheme] = useState<GalleryTheme>(initialTheme)
  const [widthPreset, setWidthPreset] = useState<GalleryWidthPreset>('standard')
  const [focusRegion, setFocusRegion] = useState<GalleryFocusRegion>('entries')
  const [previewFocusToken, setPreviewFocusToken] = useState(0)
  const browseBodyRef = useRef<ScrollBoxRenderable | null>(null)
  const previewBodyRef = useRef<ScrollBoxRenderable | null>(null)
  const infoBodyRef = useRef<ScrollBoxRenderable | null>(null)

  const initialSelection = useMemo(
    () =>
      resolveInitialSelection(gallerySections, {
        sectionId: initialSectionId,
        entryId: initialEntryId
      }),
    [initialEntryId, initialSectionId]
  )

  const [sectionId, setSectionId] = useState<GallerySectionId>(initialSelection.sectionId)
  const [categoryId, setCategoryId] = useState(initialSelection.categoryId)
  const [entryId, setEntryId] = useState(initialSelection.entryId)

  const activeSection = useMemo(
    () => gallerySections.find((section) => section.id === sectionId) ?? gallerySections[0] ?? null,
    [sectionId]
  )
  const activeCategory = useMemo(
    () => activeSection?.categories.find((category) => category.id === categoryId) ?? activeSection?.categories[0] ?? null,
    [activeSection, categoryId]
  )
  const activeEntryRecord = useMemo(() => findEntryRecord(gallerySections, entryId), [entryId])
  const activeEntry = activeEntryRecord?.entry ?? activeCategory?.entries[0] ?? null
  const [stateKey, setStateKey] = useState(activeEntry ? firstStateKey(activeEntry) : 'default')

  useEffect(() => {
    if (!activeSection) return

    const category = activeSection.categories.find((candidate) => candidate.id === categoryId) ?? activeSection.categories[0]
    if (!category) return
    if (category.id !== categoryId) {
      setCategoryId(category.id)
    }

    const entry = category.entries.find((candidate) => candidate.id === entryId) ?? category.entries[0]
    if (!entry) return
    if (entry.id !== entryId) {
      setEntryId(entry.id)
    }
  }, [activeSection, categoryId, entryId])

  useEffect(() => {
    if (!activeEntry) return
    const nextState = activeEntry.states.find((state) => state.key === stateKey)?.key ?? firstStateKey(activeEntry)
    setStateKey(nextState)
  }, [activeEntry, stateKey])

  useKeyboard((key) => {
    if (key.propagationStopped) {
      return
    }

    const scrollTarget = focusRegion === 'sections' || focusRegion === 'categories'
      ? browseBodyRef.current
      : focusRegion === 'states'
        ? infoBodyRef.current
        : previewBodyRef.current

    if (key.ctrl && key.name === 'c') {
      key.stopPropagation?.()
      runtime.exit()
      return
    }

    if (key.option && key.name === 't') {
      key.stopPropagation?.()
      setTheme((current) => current === 'dark' ? 'light' : 'dark')
      return
    }

    if (key.option && key.name === 'w') {
      key.stopPropagation?.()
      setWidthPreset((current) => cycleValue(widthPresetOrder, current))
      return
    }

    if (!key.ctrl && !key.meta && !key.option && key.name === 'f1') {
      key.stopPropagation?.()
      setFocusRegion('sections')
      return
    }

    if (!key.ctrl && !key.meta && !key.option && key.name === 'f2') {
      key.stopPropagation?.()
      setFocusRegion('categories')
      return
    }

    if (!key.ctrl && !key.meta && !key.option && key.name === 'f3') {
      key.stopPropagation?.()
      setFocusRegion('entries')
      return
    }

    if (!key.ctrl && !key.meta && !key.option && key.name === 'f4') {
      key.stopPropagation?.()
      setFocusRegion('preview')
      setPreviewFocusToken((current) => current + 1)
      return
    }

    if (!key.ctrl && !key.meta && !key.option && key.name === 'f5') {
      key.stopPropagation?.()
      setFocusRegion('states')
      return
    }

    if (!key.ctrl && !key.meta && !key.option && key.name === 'tab') {
      key.stopPropagation?.()
      const ordered = key.shift ? [...focusOrder].reverse() : focusOrder
      const nextRegion = cycleValue(ordered, focusRegion)
      setFocusRegion(nextRegion)
      if (nextRegion === 'preview') {
        setPreviewFocusToken((current) => current + 1)
      }
      return
    }

    if (scrollTarget && !key.meta && !key.option && key.name === 'pageup') {
      key.stopPropagation?.()
      scrollTarget.scrollBy(-1, 'viewport')
      return
    }

    if (scrollTarget && !key.meta && !key.option && key.name === 'pagedown') {
      key.stopPropagation?.()
      scrollTarget.scrollBy(1, 'viewport')
      return
    }

    if (scrollTarget && key.ctrl && key.name === 'u') {
      key.stopPropagation?.()
      scrollTarget.scrollBy(-0.5, 'viewport')
      return
    }

    if (scrollTarget && key.ctrl && key.name === 'd') {
      key.stopPropagation?.()
      scrollTarget.scrollBy(0.5, 'viewport')
    }
  })

  const shellHeight = Math.max(24, terminalHeight - 2)
  const layoutMode = resolveSidebarLayoutMode(terminalWidth, 'auto', {
    mediumMinWidth: 100,
    wideMinWidth: 132
  })
  const paneWidths = resolvePaneWidths(widthPreset, terminalWidth, layoutMode)
  const categoryWidth = paneWidths.browseWidth
  const infoWidth = paneWidths.infoWidth
  const previewWidth = paneWidths.previewWidth

  const stateOptions = activeEntry?.states ?? fallbackEntry().states
  const activeState = stateOptions.find((state) => state.key === stateKey) ?? stateOptions[0]
  const activeCategoryFromLookup = activeEntryRecord ? findCategory(gallerySections, activeEntryRecord.category.id) : activeCategory
  const summaryLine = activeEntry
    ? `${activeEntry.kind === 'recipe' ? 'Recipe' : 'Example'} · ${activeCategoryFromLookup?.title ?? ''}`
    : 'No entry selected'

  const previewNode = activeEntry?.render({
    active: focusRegion === 'preview',
    focusToken: previewFocusToken,
    previewWidth,
    terminalWidth,
    stateKey
  }) ?? <text content='No preview available.' />

  useEffect(() => {
    previewBodyRef.current?.scrollTo(0)
    infoBodyRef.current?.scrollTo(0)
  }, [entryId, stateKey])

  const handleSectionChange = (nextSectionId: string) => {
    const nextSection = gallerySections.find((section) => section.id === nextSectionId)
    if (!nextSection) return

    const nextSelection = firstSelectionForSection(gallerySections, nextSection.id)
    setSectionId(nextSelection.sectionId)
    setCategoryId(nextSelection.categoryId)
    setEntryId(nextSelection.entryId)
    setStateKey(firstStateKey(nextSection.categories[0]?.entries[0] ?? activeEntry ?? fallbackEntry()))
  }

  const handleSectionSelect = (nextSectionId: string) => {
    handleSectionChange(nextSectionId)
    setFocusRegion('categories')
  }

  const handleCategoryChange = (nextCategoryId: string) => {
    const nextCategory = activeSection?.categories.find((category) => category.id === nextCategoryId)
    if (!nextCategory) return

    setCategoryId(nextCategory.id)
    setEntryId(nextCategory.entries[0]?.id ?? '')
    setStateKey(firstStateKey(nextCategory.entries[0] ?? activeEntry ?? fallbackEntry()))
  }

  const handleCategorySelect = (nextCategoryId: string) => {
    handleCategoryChange(nextCategoryId)
    setFocusRegion('entries')
  }

  const handleEntryChange = (nextEntryId: string) => {
    const nextEntry = activeCategory?.entries.find((entry) => entry.id === nextEntryId)
    if (!nextEntry) return

    setEntryId(nextEntry.id)
    setStateKey(firstStateKey(nextEntry))
  }

  const handleEntrySelect = (nextEntryId: string) => {
    handleEntryChange(nextEntryId)
    setFocusRegion('preview')
    setPreviewFocusToken((current) => current + 1)
  }

  const handleStateChange = (nextStateKey: string) => {
    setStateKey(nextStateKey)
  }

  const handleStateSelect = (nextStateKey: string) => {
    handleStateChange(nextStateKey)
    setFocusRegion('preview')
    setPreviewFocusToken((current) => current + 1)
  }

  const activePane = paneForFocus(focusRegion)

  return (
    <ThemeProvider theme={theme}>
      <Container border padding={1} style={{ height: shellHeight }}>
        <SidebarLayout
          mode='auto'
          height='100%'
          sidebarWidth={paneWidths.sidebarWidth}
          inspectorWidth={paneWidths.inspectorWidth}
          activePane={activePane}
          onActivePaneChange={(pane) => {
            setFocusRegion((current) => focusForPane(current, pane))
          }}
          paneLabels={{
            sidebar: 'Browse',
            content: 'Preview',
            inspector: 'Info'
          }}
          header={(
            <>
              <SectionHeader
                title='TUI Gallery'
                subtitle='Component examples and runtime recipes for Bunli'
                trailing={
                  <Stack direction='row' gap={1}>
                    <Badge label={theme} tone='accent' />
                    <Badge label={widthPreset} tone='default' />
                    <Badge label={focusRegion} tone='success' />
                  </Stack>
                }
              />
              <Divider />
              <text content='F1 sections · F2 categories · F3 entries · F4 preview · F5 states · PgUp/PgDn scroll · Alt+T theme · Alt+W width · Ctrl+C quit' />
            </>
          )}
          sidebar={(
            <BrowsePane
              focusRegion={focusRegion}
              sections={gallerySections}
              activeSection={activeSection}
              activeCategory={activeCategory}
              categoryId={categoryId}
              categoryWidth={categoryWidth}
              bodyRef={browseBodyRef}
              sectionId={sectionId}
              onSectionChange={handleSectionChange}
              onSectionSelect={handleSectionSelect}
              onCategoryChange={handleCategoryChange}
              onCategorySelect={handleCategorySelect}
              onFocusRegionChange={setFocusRegion}
            />
          )}
          content={(
            <PreviewPane
              activeCategory={activeCategory}
              activeEntry={activeEntry}
              entryId={entryId}
              focusRegion={focusRegion}
              bodyRef={previewBodyRef}
              previewNode={previewNode}
              previewWidth={previewWidth}
              summaryLine={summaryLine}
              onEntryChange={handleEntryChange}
              onEntrySelect={handleEntrySelect}
              onFocusRegionChange={(region) => {
                setFocusRegion(region)
                if (region === 'preview') {
                  setPreviewFocusToken((current) => current + 1)
                }
              }}
            />
          )}
          inspector={(
            <InfoPane
              activeEntry={activeEntry}
              activeState={activeState}
              focusRegion={focusRegion}
              infoWidth={infoWidth}
              bodyRef={infoBodyRef}
              stateKey={stateKey}
              stateOptions={stateOptions}
              onStateChange={handleStateChange}
              onStateSelect={handleStateSelect}
              onFocusRegionChange={setFocusRegion}
            />
          )}
          status={(
            <text content={`status :: ${summaryLine || 'No entry selected'} :: mode=${layoutMode} :: pane=${activePane}`} />
          )}
        />
      </Container>
    </ThemeProvider>
  )
}
