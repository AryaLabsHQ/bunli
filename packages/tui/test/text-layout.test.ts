import { describe, expect, test } from 'bun:test'
import {
  displayWidth,
  formatFixedWidth,
  padEndTo,
  truncateEnd
} from '../src/components/text-layout.js'

describe('@bunli/tui text layout', () => {
  test('displayWidth ignores ANSI and accounts for wide glyphs', () => {
    expect(displayWidth('\u001b[31mred\u001b[0m')).toBe(3)
    expect(displayWidth('hello')).toBe(5)
    expect(displayWidth('界')).toBe(2)
  })

  test('truncateEnd uses display width for ellipsis mode', () => {
    expect(truncateEnd('abcdef', 4)).toBe('a...')
    expect(truncateEnd('界界abc', 5)).toBe('界...')
  })

  test('truncateEnd supports clip mode', () => {
    expect(truncateEnd('abcdef', 4, { overflow: 'clip' })).toBe('abcd')
    expect(truncateEnd('界界abc', 4, { overflow: 'clip' })).toBe('界界')
  })

  test('padEndTo pads based on visual width', () => {
    expect(padEndTo('界', 4)).toBe('界  ')
    expect(displayWidth(padEndTo('界', 4))).toBe(4)
  })

  test('formatFixedWidth returns fixed display width output', () => {
    const value = formatFixedWidth('界abc', 6)
    expect(displayWidth(value)).toBe(6)
    expect(value.endsWith(' ')).toBe(true)
  })
})
