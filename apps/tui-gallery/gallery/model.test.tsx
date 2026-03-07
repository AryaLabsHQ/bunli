import { describe, expect, test } from 'bun:test'
import { gallerySections } from './content.js'
import { flattenEntries, resolveInitialSelection } from './model.js'

describe('tui gallery model', () => {
  test('every gallery entry id is unique', () => {
    const ids = flattenEntries(gallerySections).map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every section has categories and every category has entries', () => {
    for (const section of gallerySections) {
      expect(section.categories.length).toBeGreaterThan(0)
      for (const category of section.categories) {
        expect(category.entries.length).toBeGreaterThan(0)
      }
    }
  })

  test('resolves explicit entry to the correct section and category', () => {
    const selection = resolveInitialSelection(gallerySections, {
      entryId: 'route-store'
    })

    expect(selection.sectionId).toBe('recipes')
    expect(selection.categoryId).toBe('routing')
    expect(selection.entryId).toBe('route-store')
  })

  test('falls back to the first entry for the requested section', () => {
    const selection = resolveInitialSelection(gallerySections, {
      sectionId: 'components',
      entryId: 'does-not-exist'
    })

    expect(selection.sectionId).toBe('components')
    expect(selection.categoryId).toBe('forms')
    expect(selection.entryId).toBe('credentials-form')
  })
})
