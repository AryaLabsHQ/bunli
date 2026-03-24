import { describe, expect, test } from 'bun:test'
import { formatLog, type LogLevel } from '../src/utils/log.js'

describe('@bunli/tui log', () => {
  test('formats info level message', () => {
    const result = formatLog('hello')
    expect(result).toContain('INFO')
    expect(result).toContain('hello')
  })

  test('formats error level with red color', () => {
    const result = formatLog('fail', { level: 'error' })
    expect(result).toContain('\x1b[38;2;255;107;107m')
    expect(result).toContain('ERROR')
  })

  test('includes timestamp when enabled', () => {
    const result = formatLog('msg', { timestamp: true, timestampFormat: 'time' })
    // Should contain a time-like pattern
    expect(result).toContain(':')
  })

  test('formats structured fields', () => {
    const result = formatLog('request', {
      fields: { status: 200, path: '/api' }
    })
    expect(result).toContain('status=200')
    expect(result).toContain('path=/api')
  })

  test('quotes field values with spaces', () => {
    const result = formatLog('msg', {
      fields: { reason: 'out of memory' }
    })
    expect(result).toContain('reason="out of memory"')
  })

  test('all log levels have styles', () => {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
    for (const level of levels) {
      const result = formatLog('test', { level })
      expect(result).toContain(level.toUpperCase())
    }
  })

  test('uses custom separator', () => {
    const result = formatLog('msg', {
      separator: ': ',
      fields: { key: 'value' }
    })
    expect(result).toContain('key: value')
  })

  test('includes custom prefix', () => {
    const result = formatLog('msg', { prefix: '[server]' })
    expect(result).toContain('[server]')
  })

  test('fatal level is bold', () => {
    const result = formatLog('crash', { level: 'fatal' })
    expect(result).toContain('\x1b[1m')
    expect(result).toContain('FATAL')
  })

  test('defaults to info level', () => {
    const result = formatLog('hello')
    expect(result).toContain('INFO')
    expect(result).not.toContain('DEBUG')
  })

  test('iso timestamp format', () => {
    const result = formatLog('msg', { timestamp: true, timestampFormat: 'iso' })
    // ISO format contains 'Z' at the end
    expect(result).toContain('Z')
  })

  test('boolean field values', () => {
    const result = formatLog('msg', {
      fields: { active: true }
    })
    expect(result).toContain('active=true')
  })
})
