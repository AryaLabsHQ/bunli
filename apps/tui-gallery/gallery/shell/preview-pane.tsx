import type { ScrollBoxRenderable } from '@opentui/core'
import type { ReactNode, Ref } from 'react'
import { Divider, NavList, ScrollPanel } from '@bunli/tui/interactive'
import type { GalleryCategory, GalleryEntry, GalleryFocusRegion } from '../model.js'

export interface PreviewPaneProps {
  activeCategory: GalleryCategory | null
  activeEntry: GalleryEntry | null
  entryId: string
  focusRegion: GalleryFocusRegion
  bodyRef?: Ref<ScrollBoxRenderable>
  previewNode: ReactNode
  previewWidth: number
  summaryLine: string
  onEntryChange: (entryId: string) => void
  onEntrySelect: (entryId: string) => void
  onFocusRegionChange: (region: GalleryFocusRegion) => void
}

export function PreviewPane({
  activeCategory,
  activeEntry,
  entryId,
  focusRegion,
  bodyRef,
  previewNode,
  previewWidth,
  summaryLine,
  onEntryChange,
  onEntrySelect,
  onFocusRegionChange
}: PreviewPaneProps) {
  const entries = activeCategory?.entries ?? []

  return (
    <box
      height='100%'
      onMouseDown={() => {
        onFocusRegionChange('preview')
      }}
    >
      <ScrollPanel
        title={focusRegion === 'preview' ? `${activeEntry?.title ?? 'Preview'} [focus]` : activeEntry?.title ?? 'Preview'}
        subtitle={summaryLine}
        chromeLineWidth={Math.max(34, previewWidth - 6)}
        tone='accent'
        emphasis='outline'
        focused={focusRegion === 'preview' || focusRegion === 'entries'}
        height='100%'
        bodyRef={bodyRef}
      >
        <NavList
          id='gallery-preview-entries'
          title={focusRegion === 'entries' ? 'Entries [focus]' : 'Entries'}
          keyboardEnabled={focusRegion === 'entries'}
          onFocusRequest={() => onFocusRegionChange('entries')}
          scopeId='gallery:shell:entries'
          value={entryId}
          compact
          maxLineWidth={Math.max(34, previewWidth - 6)}
          onChange={onEntryChange}
          onSelect={onEntrySelect}
          items={entries.map((entry) => ({
            key: entry.id,
            label: entry.title
          }))}
        />
        <Divider />
        <box width='100%' style={{ flexDirection: 'column', gap: 1 }}>
          {previewNode}
        </box>
      </ScrollPanel>
    </box>
  )
}
