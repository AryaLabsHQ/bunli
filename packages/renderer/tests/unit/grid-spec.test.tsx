/**
 * CSS Grid specification compliance tests
 * Tests against CSS Grid specification behavior adapted for terminal constraints
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text } from '../../src/index.js'
import { createApp } from '../../src/index.js'
import { parseAnsiSequences, extractLayout, visualizeLayout } from '../utils/ansi-validator.js'
import { LayoutAssert } from '../utils/layout-validator.js'

/**
 * Helper to render and extract ANSI output
 */
async function renderToAnsi(
  element: React.ReactElement, 
  width: number = 80, 
  height: number = 24
): Promise<string> {
  let output = ''
  const stream = {
    write(chunk: string) {
      output += chunk
      return true
    },
    columns: width,
    rows: height,
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

describe("CSS Grid Specification Compliance", () => {
  describe("grid-template-columns/rows", () => {
    test("fixed size tracks", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '10 20 10',
            gridTemplateRows: '5 5'
          }}
          width={40}
          height={10}
        >
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
          <Text>D</Text>
          <Text>E</Text>
          <Text>F</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // Validate grid positioning
      const assert = new LayoutAssert(layout)
      
      // First row
      assert.itemAt('A', 1, 1)      // Column 1, Row 1
      assert.itemAt('B', 11, 1)     // Column 2 (after 10 chars)
      assert.itemAt('C', 31, 1)     // Column 3 (after 10+20 chars)
      
      // Second row
      assert.itemAt('D', 1, 6)      // Column 1, Row 2 (after 5 rows)
      assert.itemAt('E', 11, 6)     // Column 2
      assert.itemAt('F', 31, 6)     // Column 3
    })

    test("fr unit distribution", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '1fr 2fr 1fr'
          }}
          width={40}
          height={5}
        >
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
        </Box>,
        40, 5
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // With 40 width and 1fr:2fr:1fr ratio:
      // Each fr = 40/4 = 10
      // A gets 10, B gets 20, C gets 10
      new LayoutAssert(layout)
        .itemAt('A', 1, 1)
        .itemAt('B', 11, 1, 2)  // Some tolerance for rounding
        .itemAt('C', 31, 1, 2)
    })

    test("mixed fixed and fr units", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '10 1fr 10'
          }}
          width={40}
          height={5}
        >
          <Text>Fixed1</Text>
          <Text>Flexible</Text>
          <Text>Fixed2</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // 40 width - 20 fixed = 20 for 1fr
      new LayoutAssert(layout)
        .itemAt('Fixed1', 1, 1)
        .itemAt('Flexible', 11, 1)
        .itemAt('Fixed2', 31, 1)
    })
  })

  describe("grid-gap", () => {
    test("uniform gap", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '10 10',
            gridGap: 5
          }}
          width={30}
          height={10}
        >
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
          <Text>D</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      new LayoutAssert(layout)
        .itemAt('A', 1, 1)
        .itemAt('B', 16, 1)    // 1 + 10 + 5 (gap)
        .gridLayout({
          columns: 2,
          rows: 2,
          items: [
            { content: 'A' },
            { content: 'B' },
            { content: 'C' },
            { content: 'D' }
          ],
          gap: { row: 5, column: 5 }
        })
    })

    test("separate row and column gaps", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '10 10',
            gridGap: [2, 5] // [rowGap, columnGap]
          }}
          width={30}
          height={10}
        >
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
          <Text>D</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      new LayoutAssert(layout)
        .itemAt('A', 1, 1)
        .itemAt('B', 16, 1)    // 1 + 10 + 5 (column gap)
        .itemAt('C', 1, 7)     // Row 2: with 1fr rows and height=10, gap=2
        .itemAt('D', 16, 7)
    })
  })

  describe("grid-column/row placement", () => {
    test("explicit positioning", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '20 20',
            gridTemplateRows: '5 5'
          }}
          width={40}
          height={10}
        >
          <Box style={{ gridColumn: 2, gridRow: 2 }}>
            <Text>Explicit</Text>
          </Box>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // Should be in column 2, row 2
      new LayoutAssert(layout)
        .itemAt('Explicit', 21, 6) // Column 2 start, Row 2 start
    })

    test("span multiple cells", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '10 10 10'
          }}
          width={30}
          height={5}
        >
          <Box style={{ gridColumn: 'span 2' }}>
            <Text>Wide</Text>
          </Box>
          <Text>C</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // Wide should span columns 1-2, C in column 3
      new LayoutAssert(layout)
        .hasItem('Wide')
        .itemAt('C', 21, 1) // Column 3
    })
  })

  describe("grid-auto-flow", () => {
    test("row flow (default)", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '10 10',
            gridAutoFlow: 'row'
          }}
          width={20}
          height={10}
        >
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
          <Text>D</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // Should fill by rows: A B / C D
      // With no explicit row template and height=10, rows are distributed evenly
      new LayoutAssert(layout)
        .itemAt('A', 1, 1)
        .itemAt('B', 11, 1)
        .itemAt('C', 1, 6)  // Second row with 1fr distribution
        .itemAt('D', 11, 6)
    })

    test("column flow", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '10 10',
            gridTemplateRows: '1 1',
            gridAutoFlow: 'column'
          }}
          width={20}
          height={10}
        >
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
          <Text>D</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // Should fill by columns: A C / B D
      new LayoutAssert(layout)
        .itemAt('A', 1, 1)
        .itemAt('B', 1, 2)
        .itemAt('C', 11, 1)
        .itemAt('D', 11, 2)
    })
  })

  describe("alignment in grid", () => {
    test.skip("justify-self and align-self", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '20',
            gridTemplateRows: '5'
          }}
          width={20}
          height={5}
        >
          <Box style={{ justifySelf: 'center', alignSelf: 'center' }}>
            <Text>Center</Text>
          </Box>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      
      // In a 20x5 cell, "Center" (6 chars) should be around x=7, y=3
      new LayoutAssert(layout)
        .itemAt('Center', 7, 3, 2) // Some tolerance for centering
    })
  })

  describe("ANSI output for grid", () => {
    test("generates efficient updates for grid cells", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '10 10'
          }}
          width={20}
          height={5}
        >
          <Text>A</Text>
          <Text>B</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      
      // Check that text is rendered with proper spacing
      const textCommands = commands.filter(cmd => cmd.type === 'text')
      
      // Should have at least one text command with both A and B
      expect(textCommands.length).toBeGreaterThanOrEqual(1)
      
      // Find the text containing A and B
      const gridText = textCommands.find(cmd => cmd.text?.includes('A') && cmd.text?.includes('B'))
      expect(gridText).toBeDefined()
      
      // A should be at position 0, B should be at position 10 or greater
      if (gridText?.text) {
        const aPos = gridText.text.indexOf('A')
        const bPos = gridText.text.indexOf('B')
        expect(aPos).toBe(0)
        expect(bPos).toBeGreaterThanOrEqual(10)
      }
    })

    test("visualize grid layout", async () => {
      const output = await renderToAnsi(
        <Box 
          display="grid"
          style={{
            gridTemplateColumns: '5 5',
            gridTemplateRows: '2 2'
          }}
          width={10}
          height={4}
        >
          <Text>A</Text>
          <Text>B</Text>
          <Text>C</Text>
          <Text>D</Text>
        </Box>
      )

      const commands = parseAnsiSequences(output)
      const layout = extractLayout(commands)
      const visual = visualizeLayout(layout, 10, 4)
      
      // Visual representation should show grid structure
      expect(visual).toContain('A')
      expect(visual).toContain('B')
      expect(visual).toContain('C')
      expect(visual).toContain('D')
      
      // Log for debugging
      console.log('Grid visualization:')
      console.log(visual)
    })
  })
})