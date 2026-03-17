import { encode } from '@toon-format/toon'
import { stringify as yamlStringify } from 'yaml'
import type { OutputFormat } from './types.js'

/**
 * Serializes a value to the specified format. Defaults to toon.
 */
export function format(value: unknown, fmt: OutputFormat = 'toon'): string {
  if (value == null) return ''
  if (fmt === 'json') return JSON.stringify(value, null, 2)
  if (fmt === 'yaml') return yamlStringify(value)
  if (fmt === 'md') return formatMarkdown(value)
  // toon
  if (isScalar(value)) return String(value)
  return encode(value as Record<string, unknown>)
}

function isScalar(value: unknown): boolean {
  return value === null || value === undefined || typeof value !== 'object'
}

function isFlat(obj: Record<string, unknown>): boolean {
  return Object.values(obj).every(isScalar)
}

function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => typeof v === 'object' && v !== null && !Array.isArray(v))
  )
}

function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)))
  const pad = (s: string, i: number) => s.padEnd(widths[i] ?? 0)
  const headerRow = `| ${headers.map(pad).join(' | ')} |`
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`
  const body = rows.map((r) => `| ${headers.map((_, i) => pad(r[i] ?? '', i)).join(' | ')} |`)
  return `${headerRow}\n${sep}\n${body.join('\n')}`
}

function kvTable(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj)
  return table(
    ['Key', 'Value'],
    entries.map(([k, v]) => [k, String(v)])
  )
}

function columnarTable(items: Record<string, unknown>[]): string {
  const keys = [...new Set(items.flatMap(Object.keys))]
  return table(
    keys,
    items.map((item) => keys.map((k) => String(item[k] ?? '')))
  )
}

function formatMarkdown(value: unknown, path: string[] = []): string {
  if (isScalar(value)) {
    if (path.length === 0) return String(value)
    return `## ${path.join('.')}\n\n${String(value)}`
  }

  if (Array.isArray(value)) {
    if (isArrayOfObjects(value)) {
      const t = columnarTable(value)
      if (path.length === 0) return t
      return `## ${path.join('.')}\n\n${t}`
    }
    return formatMarkdown(String(value), path)
  }

  const obj = value as Record<string, unknown>
  const entries = Object.entries(obj)

  if (path.length === 0 && isFlat(obj)) return kvTable(obj)

  const needsHeadings =
    path.length > 0 || entries.length > 1 || entries.some(([, v]) => !isScalar(v))

  if (needsHeadings) {
    const sections = entries.map(([key, val]) => {
      const childPath = [...path, key]
      if (isScalar(val)) return `## ${childPath.join('.')}\n\n${String(val)}`
      if (isArrayOfObjects(val)) return `## ${childPath.join('.')}\n\n${columnarTable(val)}`
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const nested = val as Record<string, unknown>
        if (isFlat(nested)) return `## ${childPath.join('.')}\n\n${kvTable(nested)}`
        return formatMarkdown(nested, childPath)
      }
      return `## ${childPath.join('.')}\n\n${String(val)}`
    })
    return sections.join('\n\n')
  }

  return kvTable(obj)
}
