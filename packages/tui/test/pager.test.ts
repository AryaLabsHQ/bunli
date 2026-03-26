import { describe, expect, test } from 'bun:test'

/**
 * Unit tests for Pager helper logic:
 *   - line splitting
 *   - line number padding
 *   - search matching
 *   - match navigation (next/prev cycling)
 */

// ── Line splitting ──────────────────────────────────────────────────

function splitLines(content: string): string[] {
  return content.split('\n')
}

// ── Line number padding ─────────────────────────────────────────────

function padLineNumber(lineNum: number, totalLines: number): string {
  const width = String(totalLines).length
  return String(lineNum).padStart(width, ' ')
}

// ── Search matching ─────────────────────────────────────────────────

function findMatchIndices(lines: string[], query: string): number[] {
  if (!query) return []
  const lowerQuery = query.toLowerCase()
  const indices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(lowerQuery)) {
      indices.push(i)
    }
  }
  return indices
}

// ── Match navigation ────────────────────────────────────────────────

function navigateMatch(
  currentIndex: number,
  matchCount: number,
  direction: 'next' | 'prev'
): number {
  if (matchCount === 0) return 0
  if (direction === 'next') {
    return (currentIndex + 1) % matchCount
  }
  return (currentIndex - 1 + matchCount) % matchCount
}

describe('@bunli/tui pager', () => {
  // ── Line splitting ──────────────────────────────────────────────

  describe('splitLines', () => {
    test('splits content into lines', () => {
      const content = 'line one\nline two\nline three'
      expect(splitLines(content)).toEqual(['line one', 'line two', 'line three'])
    })

    test('handles empty content', () => {
      expect(splitLines('')).toEqual([''])
    })

    test('handles single line', () => {
      expect(splitLines('hello')).toEqual(['hello'])
    })

    test('preserves trailing newline as empty line', () => {
      expect(splitLines('a\nb\n')).toEqual(['a', 'b', ''])
    })
  })

  // ── Line number padding ─────────────────────────────────────────

  describe('padLineNumber', () => {
    test('pads single digit for small files', () => {
      expect(padLineNumber(1, 9)).toBe('1')
      expect(padLineNumber(9, 9)).toBe('9')
    })

    test('pads to width of total lines', () => {
      expect(padLineNumber(1, 100)).toBe('  1')
      expect(padLineNumber(10, 100)).toBe(' 10')
      expect(padLineNumber(100, 100)).toBe('100')
    })

    test('pads two-digit total correctly', () => {
      expect(padLineNumber(1, 42)).toBe(' 1')
      expect(padLineNumber(42, 42)).toBe('42')
    })
  })

  // ── Search matching ─────────────────────────────────────────────

  describe('findMatchIndices', () => {
    const lines = [
      'Hello world',
      'foo bar baz',
      'HELLO again',
      'nothing here',
      'hello'
    ]

    test('finds case-insensitive matches', () => {
      expect(findMatchIndices(lines, 'hello')).toEqual([0, 2, 4])
    })

    test('returns empty array for no matches', () => {
      expect(findMatchIndices(lines, 'xyz')).toEqual([])
    })

    test('returns empty array for empty query', () => {
      expect(findMatchIndices(lines, '')).toEqual([])
    })

    test('matches partial strings', () => {
      expect(findMatchIndices(lines, 'bar')).toEqual([1])
    })

    test('matches all lines when query is common', () => {
      const allMatch = ['aaa', 'AAA', 'AaA']
      expect(findMatchIndices(allMatch, 'a')).toEqual([0, 1, 2])
    })
  })

  // ── Match navigation ───────────────────────────────────────────

  describe('navigateMatch', () => {
    test('next wraps around to 0', () => {
      expect(navigateMatch(2, 3, 'next')).toBe(0)
    })

    test('next advances by 1', () => {
      expect(navigateMatch(0, 5, 'next')).toBe(1)
      expect(navigateMatch(3, 5, 'next')).toBe(4)
    })

    test('prev wraps around to last', () => {
      expect(navigateMatch(0, 3, 'prev')).toBe(2)
    })

    test('prev goes back by 1', () => {
      expect(navigateMatch(2, 5, 'prev')).toBe(1)
    })

    test('returns 0 when matchCount is 0', () => {
      expect(navigateMatch(0, 0, 'next')).toBe(0)
      expect(navigateMatch(0, 0, 'prev')).toBe(0)
    })

    test('handles single match', () => {
      expect(navigateMatch(0, 1, 'next')).toBe(0)
      expect(navigateMatch(0, 1, 'prev')).toBe(0)
    })
  })
})
