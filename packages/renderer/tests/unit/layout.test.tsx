/**
 * Layout engine tests
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text, Row, Column } from '../../src/index.js'
import { renderToStringAsync } from '../utils/test-helpers.js'

describe("Layout Engine", () => {
  test("renders box with fixed dimensions", async () => {
    const output = await renderToStringAsync(
      <Box width={10} height={3}>
        <Text>Test</Text>
      </Box>,
      20, 5
    )
    
    const lines = output.split('\n')
    expect(lines[0]).toBe("Test")
    expect(lines.length).toBeLessThanOrEqual(3)
  })
  
  test("calculates flex layout horizontally", async () => {
    const { renderToAnsi } = await import('../utils/test-helpers.js')
    const output = await renderToAnsi(
      <Row width={30}>
        <Box flex={1}>
          <Text>A</Text>
        </Box>
        <Box flex={2}>
          <Text>B</Text>
        </Box>
      </Row>,
      30, 5
    )
    
    // Check that both A and B are rendered
    expect(output).toContain('A')
    expect(output).toContain('B')
    
    // The renderer writes the line with proper spacing
    const contentMatch = output.match(/\x1b\[1;1H\x1b\[2K(.+?)(?:\x1b|$)/)
    expect(contentMatch).toBeTruthy()
    
    if (contentMatch) {
      const lineContent = contentMatch[1]
      // Check that A is at the beginning
      expect(lineContent.indexOf('A')).toBe(0)
      // Check that B is positioned around column 10 (with some tolerance for rounding)
      const bPos = lineContent.indexOf('B')
      expect(bPos).toBeGreaterThanOrEqual(9)
      expect(bPos).toBeLessThanOrEqual(11)
    }
  })
  
  test("calculates flex layout vertically", async () => {
    const output = await renderToStringAsync(
      <Column height={9}>
        <Box flex={1}>
          <Text>Top</Text>
        </Box>
        <Box flex={2}>
          <Text>Bottom</Text>
        </Box>
      </Column>,
      20, 10
    )
    
    const lines = output.split('\n')
    const topIndex = lines.findIndex(line => line.includes('Top'))
    const bottomIndex = lines.findIndex(line => line.includes('Bottom'))
    
    expect(topIndex).toBeGreaterThanOrEqual(0)
    expect(bottomIndex).toBeGreaterThan(topIndex)
    
    // Bottom should start around line 3 (1/3 of 9)
    expect(bottomIndex).toBeGreaterThanOrEqual(2)
    expect(bottomIndex).toBeLessThanOrEqual(4)
  })
  
  test("handles padding correctly", async () => {
    const output = await renderToStringAsync(
      <Box width={20} height={7} padding={2} style={{ border: 'single' }}>
        <Text>Padded</Text>
      </Box>,
      25, 10
    )
    
    const lines = output.split('\n')
    
    // First line should be border
    expect(lines[0]).toMatch(/^┌/)
    
    // Content should be indented by padding (2) + border (1)
    const contentLine = lines.find(line => line.includes('Padded'))
    expect(contentLine).toBeDefined()
    if (contentLine) {
      const contentStart = contentLine.indexOf('Padded')
      expect(contentStart).toBe(3) // border(1) + padding(2)
    }
  })
  
  test("handles margin correctly", async () => {
    const output = await renderToStringAsync(
      <Box>
        <Box margin={2} style={{ border: 'single' }}>
          <Text>Margin</Text>
        </Box>
      </Box>,
      30, 10
    )
    
    const lines = output.split('\n')
    
    // First two lines should be empty (margin)
    expect(lines[0].trim()).toBe("")
    expect(lines[1].trim()).toBe("")
    
    // Border should start at line 3 (0-indexed = line 2)
    expect(lines[2]).toMatch(/^\s{2}┌/) // 2 spaces for left margin
  })
  
  test("handles gap in flex containers", async () => {
    const output = await renderToStringAsync(
      <Row gap={3}>
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
      </Row>,
      20, 5
    )
    
    const line = output.split('\n')[0]
    const aPos = line.indexOf('A')
    const bPos = line.indexOf('B')
    const cPos = line.indexOf('C')
    
    expect(bPos - aPos).toBeGreaterThanOrEqual(4) // A + gap(3) + B
    expect(cPos - bPos).toBeGreaterThanOrEqual(4) // B + gap(3) + C
  })
  
  test("handles percentage width", async () => {
    const output = await renderToStringAsync(
      <Box width="50%">
        <Box style={{ border: 'single' }}>
          <Text>Half Width</Text>
        </Box>
      </Box>,
      40, 5
    )
    
    const lines = output.split('\n')
    const borderLine = lines.find(line => line.includes('─'))
    
    if (borderLine) {
      const borderLength = (borderLine.match(/─/g) || []).length
      // Should be roughly 20 characters (50% of 40)
      expect(borderLength).toBeGreaterThanOrEqual(16)
      expect(borderLength).toBeLessThanOrEqual(22)
    }
  })
  
  test("handles text wrapping", async () => {
    const output = await renderToStringAsync(
      <Box width={10}>
        <Text wrap="wrap">This is a long text that should wrap</Text>
      </Box>,
      15, 10
    )
    
    const lines = output.split('\n').filter(line => line.trim())
    
    // Text should wrap to multiple lines
    expect(lines.length).toBeGreaterThan(1)
    
    // Each line should be no longer than box width
    lines.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(10)
    })
  })
  
  test("handles text truncation", async () => {
    const output = await renderToStringAsync(
      <Box width={10}>
        <Text wrap="truncate">This is a long text</Text>
      </Box>,
      15, 5
    )
    
    const lines = output.split('\n').filter(line => line.trim())
    
    // Should only be one line
    expect(lines.length).toBe(1)
    
    // Should be truncated to box width
    expect(lines[0].length).toBeLessThanOrEqual(10)
    expect(lines[0]).toBe("This is...")
  })
  
  test("handles nested layouts", async () => {
    const output = await renderToStringAsync(
      <Box padding={1}>
        <Row>
          <Box flex={1} margin={1}>
            <Text>Left</Text>
          </Box>
          <Box flex={1} margin={1}>
            <Text>Right</Text>
          </Box>
        </Row>
      </Box>,
      40, 10
    )
    
    const lines = output.split('\n').filter(line => line.trim())
    const contentLine = lines.find(line => line.includes('Left') && line.includes('Right'))
    
    expect(contentLine).toBeDefined()
    if (contentLine) {
      const leftPos = contentLine.indexOf('Left')
      const rightPos = contentLine.indexOf('Right')
      
      // Both should be indented by padding(1) + margin(1)
      expect(leftPos).toBeGreaterThanOrEqual(2)
      
      // Right should be after Left with some gap
      expect(rightPos).toBeGreaterThan(leftPos + 4)
    }
  })
  
  test("handles min/max constraints", async () => {
    const output = await renderToStringAsync(
      <Box>
        <Box 
          width={5}
          minWidth={10}
          style={{ 
            border: 'single' 
          }}
        >
          <Text>Min</Text>
        </Box>
      </Box>,
      30, 5
    )
    
    const lines = output.split('\n')
    const borderLine = lines.find(line => line.includes('─'))
    
    if (borderLine) {
      const borderLength = (borderLine.match(/─/g) || []).length
      // Should respect minWidth of 10, not width of 5
      expect(borderLength).toBeGreaterThanOrEqual(8) // 10 - 2 for corners
    }
  })
})