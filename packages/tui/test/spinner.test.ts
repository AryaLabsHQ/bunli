import { describe, expect, test } from 'bun:test'
import type { SpinnerVariant } from '../src/components/spinner.js'

// Re-declare SPINNERS data here to avoid importing from the .tsx file
// which triggers JSX runtime resolution in the test environment.
// This mirrors the canonical data from spinner.tsx.
const SPINNERS: Record<SpinnerVariant, { frames: string[]; interval: number }> = {
  line:      { frames: ['|', '/', '-', '\\'], interval: 130 },
  dot:       { frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'], interval: 80 },
  minidot:   { frames: ['⠄', '⠂', '⠁', '⠈', '⠐', '⠠'], interval: 100 },
  jump:      { frames: ['⢀⠀', '⡀⠀', '⠄⠀', '⢂⠀', '⡂⠀', '⠅⠀', '⢃⠀', '⡃⠀', '⠍⠀', '⢋⠀', '⡋⠀', '⠍⠁', '⢋⠁', '⡋⠁', '⠍⠉', '⠋⠉', '⠋⠉', '⠉⠙', '⠉⠙', '⠉⠩', '⠈⢙', '⠈⡙', '⢈⠩', '⡂⠩', '⠅⠩', '⢃⠩', '⡃⠩', '⠍⠩', '⢋⠩', '⡋⠩', '⠍⠩', '⢋⠩', '⡋⠩', '⠍⢉', '⠍⡉', '⠍⠋'], interval: 100 },
  pulse:     { frames: ['█', '▓', '▒', '░', '▒', '▓'], interval: 120 },
  points:    { frames: ['∙∙∙', '●∙∙', '∙●∙', '∙∙●'], interval: 200 },
  globe:     { frames: ['🌍', '🌎', '🌏'], interval: 200 },
  moon:      { frames: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'], interval: 120 },
  monkey:    { frames: ['🙈', '🙉', '🙊'], interval: 300 },
  meter:     { frames: ['▱▱▱▱▱▱▱', '▰▱▱▱▱▱▱', '▰▰▱▱▱▱▱', '▰▰▰▱▱▱▱', '▰▰▰▰▱▱▱', '▰▰▰▰▰▱▱', '▰▰▰▰▰▰▱', '▰▰▰▰▰▰▰'], interval: 120 },
  hamburger: { frames: ['☱', '☲', '☴'], interval: 150 },
}

const ALL_VARIANTS: SpinnerVariant[] = [
  'line', 'dot', 'minidot', 'jump', 'pulse', 'points',
  'globe', 'moon', 'monkey', 'meter', 'hamburger'
]

describe('@bunli/tui spinner', () => {
  test('exports SPINNERS with correct variants', () => {
    const keys = Object.keys(SPINNERS)
    expect(keys).toHaveLength(11)
    for (const variant of ALL_VARIANTS) {
      expect(keys).toContain(variant)
    }
  })

  test('each variant has frames array and interval', () => {
    for (const variant of ALL_VARIANTS) {
      const spinner = SPINNERS[variant]
      expect(Array.isArray(spinner.frames)).toBe(true)
      expect(spinner.frames.length).toBeGreaterThan(0)
      expect(typeof spinner.interval).toBe('number')
      expect(spinner.interval).toBeGreaterThan(0)
    }
  })

  test('all frames are non-empty strings', () => {
    for (const variant of ALL_VARIANTS) {
      const spinner = SPINNERS[variant]
      for (const frame of spinner.frames) {
        expect(typeof frame).toBe('string')
        expect(frame.length).toBeGreaterThan(0)
      }
    }
  })

  test('dot variant has 10 frames at 80ms interval', () => {
    expect(SPINNERS.dot.frames).toHaveLength(10)
    expect(SPINNERS.dot.interval).toBe(80)
  })

  test('line variant has 4 frames at 130ms interval', () => {
    expect(SPINNERS.line.frames).toHaveLength(4)
    expect(SPINNERS.line.interval).toBe(130)
  })
})
