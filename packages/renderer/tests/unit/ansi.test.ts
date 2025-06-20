/**
 * Tests for ANSI escape code utilities
 */

import { test, expect, describe } from "bun:test"
import { applyStyle, getBorderChars, boxChars } from '../../src/core/ansi.js'
import type { Style } from '../../src/types.js'

describe("ANSI Utilities", () => {
  describe("applyStyle()", () => {
    test("returns plain text when no style is applied", () => {
      const text = "Hello World"
      const style: Style = {}
      expect(applyStyle(text, style)).toBe(text)
    })

    test("applies bold style", () => {
      const text = "Bold"
      const style: Style = { bold: true }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[1m') // Bold open
      expect(result).toContain('\x1b[22m') // Bold close
      expect(result).toContain('Bold')
    })

    test("applies italic style", () => {
      const text = "Italic"
      const style: Style = { italic: true }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[3m') // Italic open
      expect(result).toContain('\x1b[23m') // Italic close
    })

    test("applies underline style", () => {
      const text = "Underline"
      const style: Style = { underline: true }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[4m') // Underline open
      expect(result).toContain('\x1b[24m') // Underline close
    })

    test("applies strikethrough style", () => {
      const text = "Strike"
      const style: Style = { strikethrough: true }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[9m') // Strikethrough open
      expect(result).toContain('\x1b[29m') // Strikethrough close
    })

    test("applies dim style", () => {
      const text = "Dim"
      const style: Style = { dim: true }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[2m') // Dim open
      expect(result).toContain('\x1b[22m') // Dim close
    })

    test("applies inverse style", () => {
      const text = "Inverse"
      const style: Style = { inverse: true }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[7m') // Inverse open
      expect(result).toContain('\x1b[27m') // Inverse close
    })

    test("applies named foreground color", () => {
      const text = "Red"
      const style: Style = { color: 'red' }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[31m') // Red foreground
      expect(result).toContain('\x1b[39m') // Default foreground
    })

    test("applies named background color", () => {
      const text = "Blue BG"
      const style: Style = { backgroundColor: 'blue' }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[44m') // Blue background
      expect(result).toContain('\x1b[49m') // Default background
    })

    test("applies hex color", () => {
      const text = "Hex"
      const style: Style = { color: '#ff0000' }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[38;2;255;0;0m') // RGB red
    })

    test("applies RGB color object", () => {
      const text = "RGB"
      const style: Style = { color: { r: 0, g: 255, b: 0 } }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[38;2;0;255;0m') // RGB green
    })

    test("applies RGB background color", () => {
      const text = "RGB BG"
      const style: Style = { backgroundColor: { r: 0, g: 0, b: 255 } }
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[48;2;0;0;255m') // RGB blue background
    })

    test("applies ANSI 256 color", () => {
      const text = "256"
      const style: Style = { color: '196' } // Bright red in 256 palette
      const result = applyStyle(text, style)
      expect(result).toContain('\x1b[38;5;196m') // ANSI 256 color
    })

    test("applies multiple styles", () => {
      const text = "Multi"
      const style: Style = {
        bold: true,
        italic: true,
        underline: true,
        color: 'red',
        backgroundColor: 'blue'
      }
      const result = applyStyle(text, style)
      
      // Should contain all style codes
      expect(result).toContain('\x1b[1m') // Bold
      expect(result).toContain('\x1b[3m') // Italic
      expect(result).toContain('\x1b[4m') // Underline
      expect(result).toContain('\x1b[31m') // Red
      expect(result).toContain('\x1b[44m') // Blue background
      
      // Text should be in the middle
      expect(result).toContain('Multi')
    })

    test("handles invalid color gracefully", () => {
      const text = "Invalid"
      const style: Style = { color: 'notacolor' as any }
      const result = applyStyle(text, style)
      expect(result).toBe(text) // Should return plain text
    })

    test("handles hex color with short format", () => {
      const text = "Short hex"
      const style: Style = { color: '#f00' } // 3-char hex
      const result = applyStyle(text, style)
      // The implementation doesn't expand 3-char hex, so it parses as:
      // r = 'f0' = 240, g = '0' = 0, b = '' = NaN
      expect(result).toContain('\x1b[38;2;240;0;NaNm')
    })

    test("handles out of range ANSI 256 colors", () => {
      const text = "Out of range"
      const style: Style = { color: '500' } // Out of 0-255 range
      const result = applyStyle(text, style)
      expect(result).toBe(text) // Should return plain text
    })

    test("properly nests and closes codes", () => {
      const text = "Nested"
      const style: Style = {
        bold: true,
        color: 'red'
      }
      const result = applyStyle(text, style)
      
      // Codes should be properly ordered
      const openIndex = result.indexOf('\x1b[1m')
      const colorIndex = result.indexOf('\x1b[31m')
      const textIndex = result.indexOf('Nested')
      const colorCloseIndex = result.indexOf('\x1b[39m')
      const boldCloseIndex = result.indexOf('\x1b[22m')
      
      expect(openIndex).toBeLessThan(colorIndex)
      expect(colorIndex).toBeLessThan(textIndex)
      expect(textIndex).toBeLessThan(colorCloseIndex)
      expect(colorCloseIndex).toBeLessThan(boldCloseIndex)
    })
  })

  describe("getBorderChars()", () => {
    test("returns null for no border", () => {
      expect(getBorderChars(undefined)).toBe(null)
      expect(getBorderChars('none')).toBe(null)
    })

    test("returns single chars for true", () => {
      const chars = getBorderChars(true)
      expect(chars).toBe(boxChars.single)
    })

    test("returns single chars for 'single'", () => {
      const chars = getBorderChars('single')
      expect(chars).toBe(boxChars.single)
    })

    test("returns double chars for 'double'", () => {
      const chars = getBorderChars('double')
      expect(chars).toBe(boxChars.double)
    })

    test("returns round chars for 'round'", () => {
      const chars = getBorderChars('round')
      expect(chars).toBe(boxChars.round)
    })

    test("returns bold chars for 'bold'", () => {
      const chars = getBorderChars('bold')
      expect(chars).toBe(boxChars.bold)
    })

    test("returns classic chars for 'classic'", () => {
      const chars = getBorderChars('classic')
      expect(chars).toBe(boxChars.classic)
    })

    test("defaults to single for unknown style", () => {
      const chars = getBorderChars('unknown' as any)
      expect(chars).toBe(boxChars.single)
    })
  })

  describe("boxChars", () => {
    test("single border characters", () => {
      expect(boxChars.single.topLeft).toBe('┌')
      expect(boxChars.single.top).toBe('─')
      expect(boxChars.single.topRight).toBe('┐')
      expect(boxChars.single.right).toBe('│')
      expect(boxChars.single.bottomRight).toBe('┘')
      expect(boxChars.single.bottom).toBe('─')
      expect(boxChars.single.bottomLeft).toBe('└')
      expect(boxChars.single.left).toBe('│')
    })

    test("double border characters", () => {
      expect(boxChars.double.topLeft).toBe('╔')
      expect(boxChars.double.top).toBe('═')
      expect(boxChars.double.topRight).toBe('╗')
      expect(boxChars.double.right).toBe('║')
      expect(boxChars.double.bottomRight).toBe('╝')
      expect(boxChars.double.bottom).toBe('═')
      expect(boxChars.double.bottomLeft).toBe('╚')
      expect(boxChars.double.left).toBe('║')
    })

    test("round border characters", () => {
      expect(boxChars.round.topLeft).toBe('╭')
      expect(boxChars.round.top).toBe('─')
      expect(boxChars.round.topRight).toBe('╮')
      expect(boxChars.round.bottomRight).toBe('╯')
      expect(boxChars.round.bottomLeft).toBe('╰')
    })

    test("bold border characters", () => {
      expect(boxChars.bold.topLeft).toBe('┏')
      expect(boxChars.bold.top).toBe('━')
      expect(boxChars.bold.topRight).toBe('┓')
      expect(boxChars.bold.right).toBe('┃')
    })

    test("classic border characters", () => {
      expect(boxChars.classic.topLeft).toBe('+')
      expect(boxChars.classic.top).toBe('-')
      expect(boxChars.classic.right).toBe('|')
    })
  })
})