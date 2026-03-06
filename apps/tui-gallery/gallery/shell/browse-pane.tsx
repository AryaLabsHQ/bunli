import { Divider, Menu, Panel, Stack } from '@bunli/tui/interactive'
import type { GalleryCategory, GalleryFocusRegion, GallerySection } from '../model.js'
import { wrapTextLines } from '../lib/text.js'

function selectedIndex<T extends { id: string }>(items: T[], currentId: string): number {
  const index = items.findIndex((item) => item.id === currentId)
  return index < 0 ? 0 : index
}

export interface BrowsePaneProps {
  focusRegion: GalleryFocusRegion
  sections: GallerySection[]
  activeSection: GallerySection | null
  activeCategory: GalleryCategory | null
  categoryId: string
  categoryWidth: number
  entryWidth: number
  sectionId: string
  onSectionSelect: (sectionId: string) => void
  onCategorySelect: (categoryId: string) => void
}

export function BrowsePane({
  focusRegion,
  sections,
  activeSection,
  activeCategory,
  categoryId,
  categoryWidth,
  entryWidth,
  sectionId,
  onSectionSelect,
  onCategorySelect
}: BrowsePaneProps) {
  const categories = activeSection?.categories ?? []
  const detailWidth = Math.max(18, categoryWidth - 6)

  return (
    <Panel
      title={focusRegion === 'sections' || focusRegion === 'categories' ? 'Browse [focus]' : 'Browse'}
      subtitle='Sections and categories'
      tone={focusRegion === 'sections' || focusRegion === 'categories' ? 'accent' : 'default'}
      emphasis={focusRegion === 'sections' || focusRegion === 'categories' ? 'outline' : 'subtle'}
    >
      <Stack gap={1}>
        <Menu
          key={`sections:${sectionId}`}
          title={focusRegion === 'sections' ? 'Sections [focus]' : 'Sections'}
          items={sections.map((section) => ({
            key: section.id,
            label: section.title
          }))}
          initialIndex={selectedIndex(sections, sectionId)}
          scopeId='gallery:shell:sections'
          keyboardEnabled={focusRegion === 'sections'}
          maxLineWidth={categoryWidth - 6}
          onSelect={onSectionSelect}
        />
        <Menu
          key={`categories:${sectionId}:${categoryId}`}
          title={focusRegion === 'categories' ? 'Categories [focus]' : 'Categories'}
          items={categories.map((category: GalleryCategory) => ({
            key: category.id,
            label: category.title
          }))}
          initialIndex={selectedIndex(categories, categoryId)}
          scopeId='gallery:shell:categories'
          keyboardEnabled={focusRegion === 'categories'}
          maxLineWidth={entryWidth}
          onSelect={onCategorySelect}
        />
        {activeCategory ? (
          <>
            <Divider />
            <text content={activeCategory.title} />
            {wrapTextLines(activeCategory.description, detailWidth).map((line, index) => (
              <text key={`category-description-${index}`} content={line} />
            ))}
          </>
        ) : null}
      </Stack>
    </Panel>
  )
}
