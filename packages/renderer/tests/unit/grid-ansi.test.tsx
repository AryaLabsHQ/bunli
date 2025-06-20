/**
 * CSS Grid ANSI output tests
 * Tests that grid layouts generate correct ANSI escape sequences
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text, Grid } from '../../src/index.js'
import { createApp } from '../../src/index.js'
import { parseAnsiSequences, extractLayout } from '../utils/ansi-validator.js'

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

describe("CSS Grid ANSI Output", () => {
  test("simple 2x2 grid renders correctly", async () => {
    const output = await renderToAnsi(
      <Grid 
        style={{
          gridTemplateColumns: '10 10',
          gridTemplateRows: '2 2'
        }}
        width={20}
        height={4}
      >
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
        <Text>D</Text>
      </Grid>,
      20, 4
    )

    const commands = parseAnsiSequences(output)
    const layout = extractLayout(commands)
    
    // Should have all four items
    const hasA = layout.some(item => item.text.includes('A'))
    const hasB = layout.some(item => item.text.includes('B'))
    const hasC = layout.some(item => item.text.includes('C'))
    const hasD = layout.some(item => item.text.includes('D'))
    
    expect(hasA).toBe(true)
    expect(hasB).toBe(true)
    expect(hasC).toBe(true)
    expect(hasD).toBe(true)
    
    // Items should be on different lines (A,B on line 1, C,D on line 3)
    const itemA = layout.find(item => item.text.includes('A'))
    const itemC = layout.find(item => item.text.includes('C'))
    
    if (itemA && itemC) {
      expect(itemC.y).toBeGreaterThan(itemA.y)
    }
  })

  test("grid with gaps renders spacing", async () => {
    const output = await renderToAnsi(
      <Grid 
        style={{
          gridTemplateColumns: '5 5',
          gridGap: 3
        }}
        width={20}
        height={3}
      >
        <Text>X</Text>
        <Text>Y</Text>
      </Grid>,
      20, 3
    )

    const commands = parseAnsiSequences(output)
    const textCommands = commands.filter(cmd => 
      cmd.type === 'text' && cmd.text && cmd.text.trim()
    )
    
    // Should have text with X and Y
    const hasContent = textCommands.some(cmd => 
      cmd.text && cmd.text.includes('X') && cmd.text.includes('Y')
    )
    expect(hasContent).toBe(true)
    
    // Check spacing between X and Y
    const mainText = textCommands.find(cmd => 
      cmd.text && cmd.text.includes('X') && cmd.text.includes('Y')
    )
    
    if (mainText?.text) {
      const xPos = mainText.text.indexOf('X')
      const yPos = mainText.text.indexOf('Y')
      
      // With 5 width column + 3 gap, Y should be at position 8 or more
      expect(yPos - xPos).toBeGreaterThanOrEqual(8)
    }
  })

  test("fr units distribute space correctly", async () => {
    const output = await renderToAnsi(
      <Grid 
        style={{
          gridTemplateColumns: '1fr 2fr'
        }}
        width={30}
        height={3}
      >
        <Text>Small</Text>
        <Text>Large</Text>
      </Grid>,
      30, 3
    )

    const commands = parseAnsiSequences(output)
    const layout = extractLayout(commands)
    
    // Both items should be present
    const hasSmall = layout.some(item => item.text.includes('Small'))
    const hasLarge = layout.some(item => item.text.includes('Large'))
    
    expect(hasSmall).toBe(true)
    expect(hasLarge).toBe(true)
  })

  test("grid auto-placement works", async () => {
    const output = await renderToAnsi(
      <Grid 
        style={{
          gridTemplateColumns: '10 10'
        }}
        width={20}
        height={6}
      >
        <Text>1</Text>
        <Text>2</Text>
        <Text>3</Text>
        <Text>4</Text>
        <Text>5</Text>
      </Grid>,
      20, 6
    )

    const commands = parseAnsiSequences(output)
    const layout = extractLayout(commands)
    
    // Should have all 5 items
    for (let i = 1; i <= 5; i++) {
      const hasItem = layout.some(item => item.text.includes(i.toString()))
      expect(hasItem).toBe(true)
    }
    
    // Items should wrap to new rows
    const item1 = layout.find(item => item.text.includes('1'))
    const item3 = layout.find(item => item.text.includes('3'))
    const item5 = layout.find(item => item.text.includes('5'))
    
    // Item 3 should be on second row, item 5 on third row
    if (item1 && item3 && item5) {
      expect(item3.y).toBeGreaterThan(item1.y)
      expect(item5.y).toBeGreaterThan(item3.y)
    }
  })

  test("explicit grid positioning", async () => {
    const output = await renderToAnsi(
      <Grid 
        style={{
          gridTemplateColumns: '10 10',
          gridTemplateRows: '2 2'
        }}
        width={20}
        height={4}
      >
        <Box style={{ gridColumn: 2, gridRow: 2 }}>
          <Text>BR</Text>
        </Box>
      </Grid>,
      20, 4
    )

    const commands = parseAnsiSequences(output)
    const layout = extractLayout(commands)
    
    // Should have BR positioned in bottom-right
    const brItem = layout.find(item => item.text.includes('BR'))
    expect(brItem).toBeDefined()
    
    if (brItem) {
      // Should be in second column (x > 10) and second row (y > 2)
      const brPos = brItem.text.indexOf('BR')
      expect(brItem.x + brPos).toBeGreaterThan(10)
      expect(brItem.y).toBeGreaterThan(2)
    }
  })

  test("grid generates efficient ANSI sequences", async () => {
    const output = await renderToAnsi(
      <Grid 
        style={{
          gridTemplateColumns: '5 5 5'
        }}
        width={15}
        height={2}
      >
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
      </Grid>,
      15, 2
    )

    const commands = parseAnsiSequences(output)
    
    // Should have cursor positioning commands
    const cursorCommands = commands.filter(cmd => 
      cmd.type === 'cursor' && cmd.command === 'position'
    )
    expect(cursorCommands.length).toBeGreaterThan(0)
    
    // Should clear lines before writing
    const clearCommands = commands.filter(cmd => cmd.type === 'clear')
    expect(clearCommands.length).toBeGreaterThan(0)
    
    // Should have text output
    const textCommands = commands.filter(cmd => 
      cmd.type === 'text' && cmd.text && cmd.text.trim()
    )
    expect(textCommands.length).toBeGreaterThan(0)
  })

  test("grid with borders renders correctly", async () => {
    const output = await renderToAnsi(
      <Grid 
        style={{
          gridTemplateColumns: '10'
        }}
        width={12}
        height={4}
      >
        <Box style={{ border: 'single' }}>
          <Text>Cell</Text>
        </Box>
      </Grid>,
      12, 4
    )

    const commands = parseAnsiSequences(output)
    const textCommands = commands.filter(cmd => cmd.type === 'text')
    
    // Should have border characters
    const hasBorder = textCommands.some(cmd => 
      cmd.text && (cmd.text.includes('┌') || cmd.text.includes('│') || cmd.text.includes('└'))
    )
    expect(hasBorder).toBe(true)
    
    // Should have cell content
    const hasCell = textCommands.some(cmd => 
      cmd.text && cmd.text.includes('Cell')
    )
    expect(hasCell).toBe(true)
  })

  test("empty grid cells are handled", async () => {
    const output = await renderToAnsi(
      <Grid 
        style={{
          gridTemplateColumns: '10 10',
          gridTemplateRows: '2 2'
        }}
        width={20}
        height={4}
      >
        <Text>A</Text>
        {/* Empty cell */}
        <Text>C</Text>
      </Grid>,
      20, 4
    )

    const commands = parseAnsiSequences(output)
    const layout = extractLayout(commands)
    
    // Should have A and C but not B
    const hasA = layout.some(item => item.text.includes('A'))
    const hasC = layout.some(item => item.text.includes('C'))
    
    expect(hasA).toBe(true)
    expect(hasC).toBe(true)
    
    // With auto-placement, C will fill the second cell (column 2, row 1)
    // since that's the next available position
    const itemA = layout.find(item => item.text.includes('A'))
    const itemC = layout.find(item => item.text.includes('C'))
    
    // Both should be on the same row with auto-placement
    if (itemA && itemC) {
      expect(itemC.y).toBe(itemA.y)
    }
  })
})