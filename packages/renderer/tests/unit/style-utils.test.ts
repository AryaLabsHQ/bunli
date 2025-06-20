/**
 * Tests for style utilities
 */

import { test, expect, describe } from "bun:test"
import { 
  stylesEqual, 
  styleAffectsLayout,
  styleAffectsRenderOnly,
  normalizeStyle,
  styleHash
} from '../../src/utils/style-utils.js'
import type { Style } from '../../src/types.js'

describe("Style Utilities", () => {
  describe("stylesEqual()", () => {
    test("returns true for same reference", () => {
      const style: Style = { color: 'red', bold: true }
      expect(stylesEqual(style, style)).toBe(true)
    })

    test("returns true for both undefined", () => {
      expect(stylesEqual(undefined, undefined)).toBe(true)
    })

    test("returns false when one is undefined", () => {
      const style: Style = { color: 'red' }
      expect(stylesEqual(style, undefined)).toBe(false)
      expect(stylesEqual(undefined, style)).toBe(false)
    })

    test("returns true for equal styles", () => {
      const style1: Style = { color: 'red', bold: true, width: 100 }
      const style2: Style = { color: 'red', bold: true, width: 100 }
      expect(stylesEqual(style1, style2)).toBe(true)
    })

    test("returns false for different styles", () => {
      const style1: Style = { color: 'red' }
      const style2: Style = { color: 'blue' }
      expect(stylesEqual(style1, style2)).toBe(false)
    })

    test("handles all style properties", () => {
      const style1: Style = {
        color: 'red',
        backgroundColor: 'blue',
        bold: true,
        dim: false,
        italic: true,
        underline: false,
        inverse: true,
        strikethrough: false,
        border: 'single',
        width: 100,
        height: 50,
        minWidth: 10,
        maxWidth: 200,
        minHeight: 5,
        maxHeight: 100
      }
      
      const style2 = { ...style1 }
      expect(stylesEqual(style1, style2)).toBe(true)
      
      // Change each property and verify it's detected
      style2.color = 'green'
      expect(stylesEqual(style1, style2)).toBe(false)
      style2.color = 'red'
      
      style2.bold = false
      expect(stylesEqual(style1, style2)).toBe(false)
      style2.bold = true
      
      style2.width = 150
      expect(stylesEqual(style1, style2)).toBe(false)
    })

    test("handles RGB color format", () => {
      const style1: Style = { color: { r: 255, g: 0, b: 0 } }
      const style2: Style = { color: { r: 255, g: 0, b: 0 } }
      const style3: Style = { color: { r: 0, g: 255, b: 0 } }
      
      // Note: RGB objects are compared by reference, not value
      expect(stylesEqual(style1, style2)).toBe(false) // Different objects
      expect(stylesEqual(style1, style3)).toBe(false)
    })
  })

  describe("styleAffectsLayout()", () => {
    test("returns false for same reference", () => {
      const style: Style = { color: 'red', width: 100 }
      expect(styleAffectsLayout(style, style)).toBe(false)
    })

    test("returns false when only render props change", () => {
      const oldStyle: Style = { color: 'red', bold: true }
      const newStyle: Style = { color: 'blue', bold: false }
      expect(styleAffectsLayout(oldStyle, newStyle)).toBe(false)
    })

    test("returns true when layout props change", () => {
      const oldStyle: Style = { width: 100 }
      const newStyle: Style = { width: 200 }
      expect(styleAffectsLayout(oldStyle, newStyle)).toBe(true)
    })

    test("detects all layout-affecting properties", () => {
      const layoutProps: (keyof Style)[] = [
        'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'border'
      ]
      
      for (const prop of layoutProps) {
        const oldStyle: Style = {}
        const newStyle: Style = { [prop]: prop === 'border' ? 'single' : 100 }
        expect(styleAffectsLayout(oldStyle, newStyle)).toBe(true)
      }
    })

    test("handles undefined styles", () => {
      const style: Style = { width: 100 }
      expect(styleAffectsLayout(undefined, style)).toBe(true)
      expect(styleAffectsLayout(style, undefined)).toBe(true)
      expect(styleAffectsLayout(undefined, undefined)).toBe(false)
    })

    test("returns false when adding only render props", () => {
      const oldStyle: Style = {}
      const newStyle: Style = { color: 'red', bold: true }
      expect(styleAffectsLayout(oldStyle, newStyle)).toBe(false)
    })

    test("detects border changes as layout-affecting", () => {
      const oldStyle: Style = { border: 'single' }
      const newStyle: Style = { border: 'double' }
      expect(styleAffectsLayout(oldStyle, newStyle)).toBe(true)
    })
  })

  describe("styleAffectsRenderOnly()", () => {
    test("returns false for same reference", () => {
      const style: Style = { color: 'red' }
      expect(styleAffectsRenderOnly(style, style)).toBe(false)
    })

    test("returns true when only render props change", () => {
      const oldStyle: Style = { color: 'red', bold: true }
      const newStyle: Style = { color: 'blue', bold: false }
      expect(styleAffectsRenderOnly(oldStyle, newStyle)).toBe(true)
    })

    test("returns false when layout props change", () => {
      const oldStyle: Style = { width: 100, color: 'red' }
      const newStyle: Style = { width: 200, color: 'blue' }
      expect(styleAffectsRenderOnly(oldStyle, newStyle)).toBe(false)
    })

    test("returns false when styles are equal", () => {
      const oldStyle: Style = { color: 'red' }
      const newStyle: Style = { color: 'red' }
      expect(styleAffectsRenderOnly(oldStyle, newStyle)).toBe(false)
    })

    test("handles all render-only properties", () => {
      const renderProps: (keyof Style)[] = [
        'color', 'backgroundColor', 'bold', 'dim', 'italic', 
        'underline', 'inverse', 'strikethrough'
      ]
      
      for (const prop of renderProps) {
        const oldStyle: Style = {}
        const newStyle: Style = { 
          [prop]: typeof prop === 'string' && prop.includes('olor') ? 'red' : true 
        }
        expect(styleAffectsRenderOnly(oldStyle, newStyle)).toBe(true)
      }
    })
  })

  describe("normalizeStyle()", () => {
    test("returns undefined for undefined input", () => {
      // @ts-expect-error - undefined is valid input
      expect(normalizeStyle(undefined)).toBe(undefined)
    })

    test("creates consistent property order", () => {
      const style1: Style = { bold: true, color: 'red', width: 100 }
      const style2: Style = { width: 100, color: 'red', bold: true }
      
      const norm1 = normalizeStyle(style1)
      const norm2 = normalizeStyle(style2)
      
      // Should have same keys in same order
      expect(JSON.stringify(norm1)).toBe(JSON.stringify(norm2))
    })

    test("excludes undefined properties", () => {
      const style: Style = { color: 'red', bold: undefined }
      const normalized = normalizeStyle(style)
      
      expect(normalized).toHaveProperty('color', 'red')
      expect(normalized).not.toHaveProperty('bold')
    })

    test("includes all defined properties", () => {
      const style: Style = {
        color: 'red',
        backgroundColor: 'blue',
        bold: true,
        dim: false,
        italic: true,
        underline: false,
        inverse: true,
        strikethrough: false,
        border: 'single',
        width: 100,
        height: 50,
        minWidth: 10,
        maxWidth: 200,
        minHeight: 5,
        maxHeight: 100
      }
      
      const normalized = normalizeStyle(style)
      expect(normalized).toEqual(style)
    })
  })

  describe("styleHash()", () => {
    test("returns empty string for undefined", () => {
      expect(styleHash(undefined)).toBe('')
    })

    test("returns empty string for empty style", () => {
      expect(styleHash({})).toBe('')
    })

    test("creates consistent hash for same style", () => {
      const style: Style = { color: 'red', bold: true, width: 100 }
      const hash1 = styleHash(style)
      const hash2 = styleHash(style)
      expect(hash1).toBe(hash2)
    })

    test("creates different hashes for different styles", () => {
      const style1: Style = { color: 'red' }
      const style2: Style = { color: 'blue' }
      expect(styleHash(style1)).not.toBe(styleHash(style2))
    })

    test("includes all properties in hash", () => {
      const style: Style = {
        color: 'red',
        backgroundColor: 'blue',
        bold: true,
        dim: true,
        italic: true,
        underline: true,
        inverse: true,
        strikethrough: true,
        border: 'single',
        width: 100,
        height: 50,
        minWidth: 10,
        maxWidth: 200,
        minHeight: 5,
        maxHeight: 100
      }
      
      const hash = styleHash(style)
      expect(hash).toContain('c:red')
      expect(hash).toContain('bg:blue')
      expect(hash).toContain('b')
      expect(hash).toContain('d')
      expect(hash).toContain('i')
      expect(hash).toContain('u')
      expect(hash).toContain('inv')
      expect(hash).toContain('s')
      expect(hash).toContain('br:single')
      expect(hash).toContain('w:100')
      expect(hash).toContain('h:50')
      expect(hash).toContain('mw:10')
      expect(hash).toContain('xw:200')
      expect(hash).toContain('mh:5')
      expect(hash).toContain('xh:100')
    })

    test("handles boolean flags efficiently", () => {
      const style1: Style = { bold: true }
      const style2: Style = { bold: false }
      
      const hash1 = styleHash(style1)
      const hash2 = styleHash(style2)
      
      expect(hash1).toBe('b')
      expect(hash2).toBe('') // False values are omitted
    })

    test("handles RGB colors", () => {
      const style: Style = { 
        color: { r: 255, g: 0, b: 0 },
        backgroundColor: { r: 0, g: 255, b: 0 }
      }
      
      const hash = styleHash(style)
      // RGB objects are converted to string representation
      expect(hash).toContain('c:')
      expect(hash).toContain('bg:')
    })
  })
})