import { describe, expect, test } from 'bun:test'
import { __chartInternalsForTests } from '../src/charts/index.js'

describe('@bunli/tui charts', () => {
  test('computeDomain handles negative and sparse values', () => {
    const domain = __chartInternalsForTests.computeDomain([
      {
        name: 'A',
        points: [
          { value: -12 },
          { value: null },
          { value: 8 }
        ]
      }
    ])

    expect(domain.min).toBe(-12)
    expect(domain.max).toBe(8)
    expect(domain.maxAbs).toBe(12)
  })

  test('computeDomain respects explicit axis overrides', () => {
    const domain = __chartInternalsForTests.computeDomain(
      [{ points: [{ value: 2 }, { value: 3 }] }],
      { min: -5, max: 10 }
    )

    expect(domain.min).toBe(-5)
    expect(domain.max).toBe(10)
    expect(domain.maxAbs).toBe(10)
  })

  test('renderBarLine prints sparse placeholder for missing points', () => {
    const line = __chartInternalsForTests.renderBarLine({
      point: { label: 'Build', value: null },
      index: 0,
      maxAbs: 10,
      halfWidth: 8,
      formatter: (value: number) => String(value)
    })

    expect(line).toContain('Build:')
    expect(line).toContain('|')
    expect(line).toContain('·')
  })

  test('renderSparkline supports sparse data placeholders', () => {
    const sparkline = __chartInternalsForTests.renderSparkline([0, null, 5, 10], 0, 10, '·')
    expect(sparkline.length).toBe(4)
    expect(sparkline).toContain('·')
  })
})
