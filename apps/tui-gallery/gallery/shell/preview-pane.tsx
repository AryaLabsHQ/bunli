import type { ReactNode } from 'react'
import { Divider, Menu, Panel } from '@bunli/tui/interactive'
import type { GalleryCategory, GalleryEntry, GalleryFocusRegion } from '../model.js'

function selectedIndex<T extends { id: string }>(items: T[], currentId: string): number {
  const index = items.findIndex((item) => item.id === currentId)
  return index < 0 ? 0 : index
}

export interface PreviewPaneProps {
  activeCategory: GalleryCategory | null
  activeEntry: GalleryEntry | null
  entryId: string
  focusRegion: GalleryFocusRegion
  previewNode: ReactNode
  previewWidth: number
  summaryLine: string
  onEntrySelect: (entryId: string) => void
}

export function PreviewPane({
  activeCategory,
  activeEntry,
  entryId,
  focusRegion,
  previewNode,
  previewWidth,
  summaryLine,
  onEntrySelect
}: PreviewPaneProps) {
  const entries = activeCategory?.entries ?? []

  return (
    <Panel
      title={focusRegion === 'preview' ? `${activeEntry?.title ?? 'Preview'} [focus]` : activeEntry?.title ?? 'Preview'}
      subtitle={summaryLine}
      tone='accent'
      emphasis='outline'
    >
      <Menu
        key={`entries:${activeCategory?.id ?? 'none'}:${entryId}`}
        title={focusRegion === 'entries' ? 'Entries [focus]' : 'Entries'}
        items={entries.map((entry) => ({
          key: entry.id,
          label: entry.title
        }))}
        initialIndex={selectedIndex(entries, entryId)}
        scopeId='gallery:shell:entries'
        keyboardEnabled={focusRegion === 'entries'}
        maxLineWidth={Math.max(36, previewWidth - 4)}
        boxed={false}
        onSelect={onEntrySelect}
      />
      <Divider />
      <box padding={1} width={previewWidth} style={{ flexDirection: 'column', gap: 1 }}>
        {previewNode}
      </box>
    </Panel>
  )
}
