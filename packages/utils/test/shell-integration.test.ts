import { describe, expect, test } from 'bun:test'
import { stripAnsi, EXIT_CODES } from '../src/shell-integration.js'

describe('@bunli/utils shell integration', () => {
  test('stripAnsi removes ANSI codes', () => {
    expect(stripAnsi('\x1b[1mhello\x1b[0m')).toBe('hello')
    expect(stripAnsi('\x1b[38;2;255;0;0mred\x1b[0m')).toBe('red')
    expect(stripAnsi('no ansi')).toBe('no ansi')
  })

  test('stripAnsi handles multiple codes in sequence', () => {
    expect(stripAnsi('\x1b[1m\x1b[31mbold red\x1b[0m')).toBe('bold red')
  })

  test('stripAnsi handles empty string', () => {
    expect(stripAnsi('')).toBe('')
  })

  test('EXIT_CODES has expected values', () => {
    expect(EXIT_CODES.SUCCESS).toBe(0)
    expect(EXIT_CODES.CANCEL).toBe(1)
    expect(EXIT_CODES.TIMEOUT).toBe(124)
    expect(EXIT_CODES.SIGINT).toBe(130)
  })
})
