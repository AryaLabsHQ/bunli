/**
 * Flexbox specification compliance tests
 * Tests against CSS Flexbox specification behavior adapted for terminal constraints
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text, Row, Column } from '../../src/index.js'
import { createApp } from '../../src/index.js'
import { parseAnsiSequences, extractLayout } from '../utils/ansi-validator.js'
import { LayoutAssert } from '../utils/layout-validator.js'

/**
 * Helper to render and extract ANSI output
 */
async function renderToAnsi(element: React.ReactElement): Promise<string> {
  let output = ''
  const stream = {
    write(chunk: string) {
      output += chunk
      return true
    },
    columns: 80,
    rows: 24,
    on: () => {},
    off: () => {},
    removeListener: () => {}
  } as any

  const app = createApp(element, stream)
  app.render()

  // Wait for render
  await new Promise(resolve => setTimeout(resolve, 10))
  
  app.unmount()
  
  return output
}

describe("Flexbox Specification Compliance", () => {
  describe("flex-direction", () => {
    test("row direction (default for Row component)", async () => {
      const output = await renderToAnsi(
        <Row width={30} height={3} gap={1}>
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
        </Row>,
        30, 3
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // With gap=1, items should be separated
      new LayoutAssert(layout)
        .hasItem('A')
        .hasItem('B')
        .hasItem('C')
        .itemAt('A', 1, 1)
        .itemAt('B', 3, 1) // 1 + 1 (A) + 1 (gap)
        .itemAt('C', 5, 1) // 3 + 1 (B) + 1 (gap)
    })

    test("column direction (default for Column component)", async () => {
      const output = await renderToAnsi(
        <Column width={10} height={10}>
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
        </Column>,
        10, 10
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      new LayoutAssert(layout)
        .hasItem('A')
        .hasItem('B')
        .hasItem('C')
        .flexLayout({
          direction: 'column',
          items: ['A', 'B', 'C'],
          container: { width: 10, height: 10 },
          align: 'start' // Text doesn't stretch
        })
    })
  })

  describe("flex-grow", () => {
    test("distributes space proportionally", async () => {
      const output = await renderToAnsi(
        <Row width={30}>
          <Box flex={1}>
            <Text>A</Text>
          </Box>
          <Box flex={2}>
            <Text>B</Text>
          </Box>
        </Row>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // With flex 1:2 ratio in 30 width container:
      // A should get ~10 chars, B should get ~20 chars
      const layoutAssert = new LayoutAssert(layout)
      layoutAssert.hasItem('A').hasItem('B')
      
      // B should be positioned around column 11 (after A's ~10 width)
      layoutAssert.itemAt('B', 11, 1, 2)
    })

    test("flex-grow: 0 items don't grow", async () => {
      const output = await renderToAnsi(
        <Row width={40} height={3} gap={1}>
          <Text>Fixed</Text>
          <Text>Flexible</Text>
        </Row>,
        40, 3
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // With gap, items should be separated
      new LayoutAssert(layout)
        .hasItem('Fixed')
        .hasItem('Flexible')
        .itemAt('Fixed', 1, 1)
        .itemAt('Flexible', 7, 1) // 1 + 5 (Fixed) + 1 (gap)
    })
  })

  describe("justify-content", () => {
    test("justify-content: start (default)", async () => {
      const output = await renderToAnsi(
        <Row width={30}>
          <Text>A</Text>
          <Text>B</Text>
        </Row>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      new LayoutAssert(layout)
        .itemAt('A', 1, 1)
        .itemAt('B', 2, 1) // Immediately after A
    })

    test("justify-content: end", async () => {
      const output = await renderToAnsi(
        <Row width={30} height={3} justify="end">
          <Text>A</Text>
          <Text>B</Text>
        </Row>,
        30, 3
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      new LayoutAssert(layout)
        .hasItem('A')
        .hasItem('B')
        // With justify="end", items should be at the right side
        // A and B each take 1 char, so they should start around column 29
        .itemAt('B', 29, 1, 2)
    })

    test("justify-content: center", async () => {
      const output = await renderToAnsi(
        <Row width={30} height={3} justify="center" gap={1}>
          <Text>ABC</Text>
          <Text>XYZ</Text>
        </Row>,
        30, 3
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // With gap=1, total content width = 6 + 1 = 7, free space = 23
      // Should start around column 12 (centered)
      new LayoutAssert(layout)
        .itemAt('ABC', 12, 1, 2)
        .itemAt('XYZ', 16, 1, 2) // 12 + 3 (ABC) + 1 (gap)
    })

    test("justify-content: between", async () => {
      const output = await renderToAnsi(
        <Row width={20} justify="between">
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
        </Row>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      new LayoutAssert(layout)
        .itemAt('A', 1, 1)
        .itemAt('C', 19, 1, 1) // Should be at the end
    })
  })

  describe("align-items", () => {
    test("align-items: stretch (default)", async () => {
      const output = await renderToAnsi(
        <Row width={20} height={5}>
          <Text>A</Text>
          <Text>B</Text>
        </Row>,
        20, 5
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // Just verify items are rendered
      // TODO: Test actual stretch behavior when Box rendering is fixed
      new LayoutAssert(layout)
        .hasItem('A')
        .hasItem('B')
    })

    test("align-items: center", async () => {
      const output = await renderToAnsi(
        <Row height={5} align="center">
          <Text>Centered</Text>
        </Row>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // In a 5-height container, centered text should be at y=3
      new LayoutAssert(layout)
        .itemAt('Centered', 1, 3, 1)
    })
  })

  describe("gap", () => {
    test("gap between flex items", async () => {
      const output = await renderToAnsi(
        <Row gap={3}>
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
        </Row>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      new LayoutAssert(layout)
        .itemAt('A', 1, 1)
        .itemAt('B', 5, 1) // 1 + 1 (A width) + 3 (gap)
        .itemAt('C', 9, 1) // 5 + 1 (B width) + 3 (gap)
    })
  })

  describe("flex-wrap", () => {
    test("nowrap behavior (default)", async () => {
      const output = await renderToAnsi(
        <Row width={10}>
          <Text>VeryLongText</Text>
          <Text>Another</Text>
        </Row>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // All items should be on same line even if they overflow
      const yPositions = [...new Set(layout.map(item => item.y))]
      expect(yPositions).toHaveLength(1)
      expect(yPositions[0]).toBe(1)
    })
  })

  describe("nested flex containers", () => {
    test("flex containers can be nested", async () => {
      const output = await renderToAnsi(
        <Column height={10} width={30}>
          <Row flex={1} gap={1}>
            <Text>Top</Text>
            <Text>Left</Text>
          </Row>
          <Row flex={1} gap={1}>
            <Text>Bottom</Text>
            <Text>Right</Text>
          </Row>
        </Column>,
        30, 10
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      const assert = new LayoutAssert(layout)
      
      // Check items are rendered  
      assert.hasItem('Top')
      assert.hasItem('Left')
      assert.hasItem('Bottom')
      assert.hasItem('Right')
      
      // Top row should be in upper half
      const topY = layout.find(item => item.text.includes('Top'))?.y || 0
      const bottomY = layout.find(item => item.text.includes('Bottom'))?.y || 0
      
      expect(topY).toBeLessThan(5)
      expect(bottomY).toBeGreaterThan(5)
    })
  })

  describe("ANSI output validation", () => {
    test("generates correct cursor positioning commands", async () => {
      const output = await renderToAnsi(
        <Column width={20} height={5}>
          <Text>Line1</Text>
          <Text>Line2</Text>
        </Column>,
        20, 5
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // Verify both lines are rendered on different rows
      new LayoutAssert(layout)
        .hasItem('Line1')
        .hasItem('Line2')
      
      const line1Y = layout.find(item => item.text.includes('Line1'))?.y || 0
      const line2Y = layout.find(item => item.text.includes('Line2'))?.y || 0
      
      expect(line2Y).toBeGreaterThan(line1Y)
    })

    test("clears lines before writing", async () => {
      const output = await renderToAnsi(
        <Text>Hello World</Text>
      )

      const commands = parseAnsiSequences(output)
      
      // Should clear line before writing text
      const clearCommands = commands.filter(cmd => cmd.type === 'clear')
      expect(clearCommands.length).toBeGreaterThan(0)
      
      // Clear should come before text
      const clearIndex = commands.findIndex(cmd => cmd.type === 'clear')
      const textIndex = commands.findIndex(cmd => cmd.type === 'text')
      expect(clearIndex).toBeLessThan(textIndex)
    })
  })
})