import { describe, expect, test } from 'bun:test'
import { styled, BORDERS } from '../src/utils/style.js'

describe('@bunli/tui style', () => {
  test('applies bold ANSI code', () => {
    const result = styled().bold().render('hello')
    expect(result).toContain('\x1b[1m')
    expect(result).toContain('hello')
    expect(result).toContain('\x1b[0m')
  })

  test('applies italic ANSI code', () => {
    const result = styled().italic().render('hello')
    expect(result).toContain('\x1b[3m')
  })

  test('applies underline ANSI code', () => {
    const result = styled().underline().render('hello')
    expect(result).toContain('\x1b[4m')
  })

  test('applies strikethrough ANSI code', () => {
    const result = styled().strikethrough().render('hello')
    expect(result).toContain('\x1b[9m')
  })

  test('applies faint ANSI code', () => {
    const result = styled().faint().render('hello')
    expect(result).toContain('\x1b[2m')
  })

  test('applies hex foreground color', () => {
    const result = styled().foreground('#FF0000').render('red')
    expect(result).toContain('\x1b[38;2;255;0;0m')
  })

  test('applies hex background color', () => {
    const result = styled().background('#00FF00').render('green')
    expect(result).toContain('\x1b[48;2;0;255;0m')
  })

  test('applies named foreground color', () => {
    const result = styled().foreground('blue').render('blue')
    expect(result).toContain('\x1b[38;2;0;0;255m')
  })

  test('applies 3-digit hex color', () => {
    const result = styled().foreground('#F00').render('red')
    expect(result).toContain('\x1b[38;2;255;0;0m')
  })

  test('combines multiple text decorations', () => {
    const result = styled().bold().italic().underline().render('styled')
    expect(result).toContain('\x1b[1m')
    expect(result).toContain('\x1b[3m')
    expect(result).toContain('\x1b[4m')
    expect(result).toContain('styled')
  })

  test('renders border', () => {
    const result = styled().border('rounded').render('hi')
    expect(result).toContain('\u256D')
    expect(result).toContain('\u256F')
    expect(result).toContain('\u2502')
    expect(result).toContain('hi')
  })

  test('renders normal border', () => {
    const result = styled().border('normal').render('hi')
    expect(result).toContain('\u250C')
    expect(result).toContain('\u2518')
  })

  test('renders thick border', () => {
    const result = styled().border('thick').render('hi')
    expect(result).toContain('\u250F')
    expect(result).toContain('\u251B')
  })

  test('renders double border', () => {
    const result = styled().border('double').render('hi')
    expect(result).toContain('\u2554')
    expect(result).toContain('\u255D')
  })

  test('border with foreground color', () => {
    const result = styled().border('rounded').borderForeground('#6AC4FF').render('hi')
    expect(result).toContain('\x1b[38;2;106;196;255m')
    expect(result).toContain('\u256D')
  })

  test('applies padding', () => {
    const result = styled().padding(0, 2).render('x')
    expect(result).toContain('  x  ')
  })

  test('applies vertical padding', () => {
    const result = styled().padding(1, 0).render('x')
    const lines = result.split('\n')
    expect(lines.length).toBe(3)
    expect(lines[1]).toContain('x')
  })

  test('applies all four padding values', () => {
    const result = styled().padding(1, 2, 1, 3).render('x')
    const lines = result.split('\n')
    expect(lines.length).toBe(3)
    expect(lines[1]).toBe('   x  ')
  })

  test('applies margin', () => {
    const result = styled().margin(1, 2).render('x')
    const lines = result.split('\n')
    expect(lines.length).toBe(3)
    expect(lines[0]).toBe('')
    expect(lines[1]).toBe('  x  ')
    expect(lines[2]).toBe('')
  })

  test('width with left alignment', () => {
    const result = styled().width(10).align('left').render('hi')
    expect(result).toBe('hi        ')
  })

  test('width with right alignment', () => {
    const result = styled().width(10).align('right').render('hi')
    expect(result).toBe('        hi')
  })

  test('width with center alignment', () => {
    const result = styled().width(10).align('center').render('hi')
    expect(result).toBe('    hi    ')
  })

  test('none border type does not add border characters', () => {
    const result = styled().border('none').render('hi')
    expect(result).toBe('hi')
  })

  test('hidden border uses spaces', () => {
    const result = styled().border('hidden').render('hi')
    expect(result).toContain(' hi ')
  })

  test('BORDERS constant has all types', () => {
    expect(Object.keys(BORDERS)).toHaveLength(6)
    expect(BORDERS).toHaveProperty('rounded')
    expect(BORDERS).toHaveProperty('normal')
    expect(BORDERS).toHaveProperty('thick')
    expect(BORDERS).toHaveProperty('double')
    expect(BORDERS).toHaveProperty('hidden')
    expect(BORDERS).toHaveProperty('none')
  })

  test('styled() returns a new builder each time', () => {
    const a = styled().bold()
    const b = styled().italic()
    const resultA = a.render('a')
    const resultB = b.render('b')
    expect(resultA).toContain('\x1b[1m')
    expect(resultA).not.toContain('\x1b[3m')
    expect(resultB).toContain('\x1b[3m')
    expect(resultB).not.toContain('\x1b[1m')
  })

  test('builder chain is immutable', () => {
    const base = styled()
    const bold = base.bold()
    const italic = base.italic()
    expect(bold.render('x')).toContain('\x1b[1m')
    expect(bold.render('x')).not.toContain('\x1b[3m')
    expect(italic.render('x')).toContain('\x1b[3m')
    expect(italic.render('x')).not.toContain('\x1b[1m')
  })

  test('plain text without styles returns unchanged', () => {
    const result = styled().render('hello')
    expect(result).toBe('hello')
  })

  test('multiline text preserves lines', () => {
    const result = styled().bold().render('line1\nline2')
    const lines = result.split('\n')
    expect(lines.length).toBe(2)
    expect(lines[0]).toContain('line1')
    expect(lines[1]).toContain('line2')
  })

  test('border with padding renders correctly', () => {
    const result = styled().border('rounded').padding(0, 2).render('hi')
    const lines = result.split('\n')
    expect(lines.length).toBe(3)
    expect(lines[0]).toContain('\u256D')
    expect(lines[1]).toContain('  hi  ')
    expect(lines[2]).toContain('\u256F')
  })
})
