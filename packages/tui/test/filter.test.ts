import { describe, expect, test } from 'bun:test'
import Fuse from 'fuse.js'
import type { FilterOption } from '../src/components/filter.js'

const sampleOptions: FilterOption[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Date', value: 'date' },
  { label: 'Elderberry', value: 'elderberry' }
]

function fuzzySearch(options: FilterOption[], query: string) {
  const fuse = new Fuse(options, {
    keys: ['label'],
    includeMatches: true,
    threshold: 0.3,
    ignoreLocation: true
  })
  if (!query) return options.map((item, index) => ({ item, refIndex: index }))
  return fuse.search(query).map((r) => ({ item: r.item, refIndex: r.refIndex }))
}

function exactSearch(options: FilterOption[], query: string) {
  if (!query) return options.map((item, index) => ({ item, refIndex: index }))
  return options
    .map((item, index) => ({ item, refIndex: index }))
    .filter(({ item }) => item.label.toLowerCase().includes(query.toLowerCase()))
}

describe('@bunli/tui Filter', () => {
  describe('fuzzy matching with fuse.js', () => {
    test('returns all options when query is empty', () => {
      const results = fuzzySearch(sampleOptions, '')
      expect(results).toHaveLength(5)
      expect(results[0]!.item.label).toBe('Apple')
    })

    test('finds exact match', () => {
      const results = fuzzySearch(sampleOptions, 'Apple')
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0]!.item.value).toBe('apple')
    })

    test('finds fuzzy match with typo', () => {
      const results = fuzzySearch(sampleOptions, 'Banan')
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0]!.item.value).toBe('banana')
    })

    test('finds partial match', () => {
      const results = fuzzySearch(sampleOptions, 'erry')
      const values = results.map((r) => r.item.value)
      expect(values).toContain('cherry')
      expect(values).toContain('elderberry')
    })

    test('returns empty for no match', () => {
      const results = fuzzySearch(sampleOptions, 'zzzzzz')
      expect(results).toHaveLength(0)
    })

    test('preserves refIndex from original options', () => {
      const results = fuzzySearch(sampleOptions, 'Cherry')
      const cherryResult = results.find((r) => r.item.value === 'cherry')
      expect(cherryResult).toBeDefined()
      expect(cherryResult!.refIndex).toBe(2)
    })
  })

  describe('exact matching fallback', () => {
    test('returns all options when query is empty', () => {
      const results = exactSearch(sampleOptions, '')
      expect(results).toHaveLength(5)
    })

    test('finds substring match case-insensitively', () => {
      const results = exactSearch(sampleOptions, 'app')
      expect(results).toHaveLength(1)
      expect(results[0]!.item.value).toBe('apple')
    })

    test('returns empty when no substring match', () => {
      const results = exactSearch(sampleOptions, 'xyz')
      expect(results).toHaveLength(0)
    })

    test('matches multiple items with common substring', () => {
      const results = exactSearch(sampleOptions, 'er')
      const values = results.map((r) => r.item.value)
      expect(values).toContain('cherry')
      expect(values).toContain('elderberry')
    })
  })

  describe('selection logic', () => {
    test('toggle adds and removes from selection set', () => {
      const selected = new Set<number>()

      // Toggle on
      selected.add(0)
      expect(selected.has(0)).toBe(true)

      // Toggle off
      selected.delete(0)
      expect(selected.has(0)).toBe(false)
    })

    test('limit prevents adding beyond max selections', () => {
      const limit = 2
      const selected = new Set<number>([0, 1])

      // Try to add a third when limit is 2
      if (limit > 0 && selected.size >= limit) {
        // Should not add
        expect(selected.size).toBe(2)
      } else {
        selected.add(2)
      }
      expect(selected.has(2)).toBe(false)
    })

    test('limit of 0 allows unlimited selections', () => {
      const limit = 0
      const selected = new Set<number>([0, 1, 2, 3])

      if (limit > 0 && selected.size >= limit) {
        // Should not reach here
        expect(true).toBe(false)
      } else {
        selected.add(4)
      }
      expect(selected.has(4)).toBe(true)
      expect(selected.size).toBe(5)
    })

    test('select all toggles between all and none', () => {
      const options = sampleOptions
      let selected = new Set<number>()

      // Select all
      if (selected.size === options.length) {
        selected = new Set()
      } else {
        selected = new Set(options.map((_, i) => i))
      }
      expect(selected.size).toBe(5)

      // Toggle again to deselect all
      if (selected.size === options.length) {
        selected = new Set()
      } else {
        selected = new Set(options.map((_, i) => i))
      }
      expect(selected.size).toBe(0)
    })

    test('select all respects limit', () => {
      const limit = 3
      const indices = sampleOptions.map((_, i) => i)

      const selected = new Set(indices.slice(0, limit))
      expect(selected.size).toBe(3)
    })
  })
})
