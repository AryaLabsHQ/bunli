import { useEffect, useMemo, useState } from 'react'
import { useRuntime } from '@bunli/runtime/app'
import {
  Badge,
  Container,
  Divider,
  SectionHeader,
  Stack,
  ThemeProvider,
  useKeyboard,
  useTerminalDimensions
} from '@bunli/tui/interactive'
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

function widthPresetColumns(preset: GalleryWidthPreset, terminalWidth: number): number {
  if (preset === 'narrow') return Math.min(54, Math.max(36, terminalWidth - 18))
  if (preset === 'wide') return Math.min(96, Math.max(52, terminalWidth - 10))
  return Math.min(74, Math.max(44, terminalWidth - 14))
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
  const { width: terminalWidth = 140 } = useTerminalDimensions()
  const [theme, setTheme] = useState<GalleryTheme>(initialTheme)
  const [widthPreset, setWidthPreset] = useState<GalleryWidthPreset>('standard')
  const [focusRegion, setFocusRegion] = useState<GalleryFocusRegion>('entries')
  const [previewFocusToken, setPreviewFocusToken] = useState(0)

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
    }
  })

  const isNarrow = terminalWidth < 132
  const categoryWidth = isNarrow ? Math.max(28, terminalWidth - 6) : 28
  const entryWidth = Math.max(36, terminalWidth - 6)
  const infoWidth = isNarrow ? Math.max(36, terminalWidth - 6) : widthPreset === 'wide' ? 42 : 38
  const availableDesktopPreviewWidth = Math.max(44, terminalWidth - categoryWidth - infoWidth - 16)
  const previewWidth = isNarrow
    ? widthPresetColumns(widthPreset, terminalWidth)
    : widthPreset === 'narrow'
      ? Math.max(44, availableDesktopPreviewWidth - 16)
      : widthPreset === 'wide'
        ? availableDesktopPreviewWidth
        : Math.max(48, availableDesktopPreviewWidth - 8)

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

  const handleSectionSelect = (nextSectionId: string) => {
    const nextSection = gallerySections.find((section) => section.id === nextSectionId)
    if (!nextSection) return

    const nextSelection = firstSelectionForSection(gallerySections, nextSection.id)
    setSectionId(nextSelection.sectionId)
    setCategoryId(nextSelection.categoryId)
    setEntryId(nextSelection.entryId)
    setStateKey(firstStateKey(nextSection.categories[0]?.entries[0] ?? activeEntry ?? fallbackEntry()))
    setFocusRegion('categories')
  }

  const handleCategorySelect = (nextCategoryId: string) => {
    const nextCategory = activeSection?.categories.find((category) => category.id === nextCategoryId)
    if (!nextCategory) return

    setCategoryId(nextCategory.id)
    setEntryId(nextCategory.entries[0]?.id ?? '')
    setStateKey(firstStateKey(nextCategory.entries[0] ?? activeEntry ?? fallbackEntry()))
    setFocusRegion('entries')
  }

  const handleEntrySelect = (nextEntryId: string) => {
    const nextEntry = activeCategory?.entries.find((entry) => entry.id === nextEntryId)
    if (!nextEntry) return

    setEntryId(nextEntry.id)
    setStateKey(firstStateKey(nextEntry))
    setFocusRegion('preview')
    setPreviewFocusToken((current) => current + 1)
  }

  const handleStateSelect = (nextStateKey: string) => {
    setStateKey(nextStateKey)
    setFocusRegion('preview')
    setPreviewFocusToken((current) => current + 1)
  }

  const layout = (
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
      <text content='F1 sections · F2 categories · F3 entries · F4 preview · F5 states · Alt+T theme · Alt+W width · Ctrl+C quit' />

      {isNarrow ? (
        <Stack gap={2}>
          <BrowsePane
            focusRegion={focusRegion}
            sections={gallerySections}
            activeSection={activeSection}
            activeCategory={activeCategory}
            categoryId={categoryId}
            categoryWidth={categoryWidth}
            entryWidth={entryWidth}
            sectionId={sectionId}
            onSectionSelect={handleSectionSelect}
            onCategorySelect={handleCategorySelect}
          />
          <PreviewPane
            activeCategory={activeCategory}
            activeEntry={activeEntry}
            entryId={entryId}
            focusRegion={focusRegion}
            previewNode={previewNode}
            previewWidth={previewWidth}
            summaryLine={summaryLine}
            onEntrySelect={handleEntrySelect}
          />
          <InfoPane
            activeEntry={activeEntry}
            activeState={activeState}
            focusRegion={focusRegion}
            infoWidth={infoWidth}
            stateKey={stateKey}
            stateOptions={stateOptions}
            onStateSelect={handleStateSelect}
          />
        </Stack>
      ) : (
        <Stack direction='row' gap={2}>
          <box width={categoryWidth}>
            <BrowsePane
              focusRegion={focusRegion}
              sections={gallerySections}
              activeSection={activeSection}
              activeCategory={activeCategory}
              categoryId={categoryId}
              categoryWidth={categoryWidth}
              entryWidth={categoryWidth - 6}
              sectionId={sectionId}
              onSectionSelect={handleSectionSelect}
              onCategorySelect={handleCategorySelect}
            />
          </box>

          <box width={Math.max(40, previewWidth + 6)} style={{ flexGrow: 1 }}>
            <PreviewPane
              activeCategory={activeCategory}
              activeEntry={activeEntry}
              entryId={entryId}
              focusRegion={focusRegion}
              previewNode={previewNode}
              previewWidth={previewWidth}
              summaryLine={summaryLine}
              onEntrySelect={handleEntrySelect}
            />
          </box>

          <box width={infoWidth}>
            <InfoPane
              activeEntry={activeEntry}
              activeState={activeState}
              focusRegion={focusRegion}
              infoWidth={infoWidth}
              stateKey={stateKey}
              stateOptions={stateOptions}
              onStateSelect={handleStateSelect}
            />
          </box>
        </Stack>
      )}
    </>
  )

  return (
    <ThemeProvider theme={theme}>
      <Container border padding={1}>
        {layout}
      </Container>
    </ThemeProvider>
  )
}
