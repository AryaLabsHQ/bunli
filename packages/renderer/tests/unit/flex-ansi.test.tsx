/**
 * Flexbox ANSI output tests
 * Tests that flexbox layouts generate correct ANSI escape sequences
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text, Row, Column } from '../../src/index.js'
import { createApp } from '../../src/index.js'
import { parseAnsiSequences, extractLayout } from '../utils/ansi-validator.js'

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

describe("Flexbox ANSI Output", () => {
  test("horizontal flex renders text in a single line", async () => {
    const output = await renderToAnsi(
      <Row>
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
      </Row>
    )

    const commands = parseAnsiSequences(output)
    const layout = extractLayout(commands)
    
    // Find the ABC text
    const abcItem = layout.find(item => item.text === 'ABC')
    expect(abcItem).toBeDefined()
    expect(abcItem?.x).toBe(1)
    expect(abcItem?.y).toBe(1)
  })

  test("vertical flex renders text on separate lines", async () => {
    const output = await renderToAnsi(
      <Column>
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
      </Column>
    )

    const commands = parseAnsiSequences(output)
    const layout = extractLayout(commands)
    
    // Should have separate items on different lines
    const aItem = layout.find(item => item.text === 'A')
    const bItem = layout.find(item => item.text === 'B')
    const cItem = layout.find(item => item.text === 'C')
    
    expect(aItem).toBeDefined()
    expect(bItem).toBeDefined()
    expect(cItem).toBeDefined()
    
    expect(aItem?.y).toBe(1)
    expect(bItem?.y).toBe(2)
    expect(cItem?.y).toBe(3)
  })

  test("flex with spacing renders correctly", async () => {
    const output = await renderToAnsi(
      <Row width={30}>
        <Box flex={1}>
          <Text>A</Text>
        </Box>
        <Box flex={1}>
          <Text>B</Text>
        </Box>
      </Row>
    )

    const commands = parseAnsiSequences(output)
    
    // Find cursor positioning commands
    const cursorCommands = commands.filter(cmd => 
      cmd.type === 'cursor' && cmd.command === 'position'
    )
    
    // Should have at least one cursor position for initial setup
    expect(cursorCommands.length).toBeGreaterThan(0)
    
    // Find text commands
    const textCommands = commands.filter(cmd => cmd.type === 'text')
    const textWithContent = textCommands.filter(cmd => 
      cmd.text && cmd.text.trim().length > 0
    )
    
    // Should have text output
    expect(textWithContent.length).toBeGreaterThan(0)
    
    // The text should contain both A and B
    const allText = textWithContent.map(cmd => cmd.text).join('')
    expect(allText).toContain('A')
    expect(allText).toContain('B')
  })

  test("flex with gap positions items correctly", async () => {
    const output = await renderToAnsi(
      <Row gap={5}>
        <Text>X</Text>
        <Text>Y</Text>
        <Text>Z</Text>
      </Row>
    )

    const commands = parseAnsiSequences(output)
    
    // Check if we have proper spacing
    const textCommands = commands.filter(cmd => cmd.type === 'text')
    const mainText = textCommands.find(cmd => 
      cmd.text && (cmd.text.includes('X') || cmd.text.includes('Y') || cmd.text.includes('Z'))
    )
    
    expect(mainText).toBeDefined()
    
    // With gap, items should be spaced apart
    if (mainText?.text) {
      // Check spacing between characters
      const xPos = mainText.text.indexOf('X')
      const yPos = mainText.text.indexOf('Y')
      const zPos = mainText.text.indexOf('Z')
      
      if (xPos >= 0 && yPos >= 0) {
        expect(yPos - xPos).toBeGreaterThanOrEqual(6) // 1 char + 5 gap
      }
      if (yPos >= 0 && zPos >= 0) {
        expect(zPos - yPos).toBeGreaterThanOrEqual(6) // 1 char + 5 gap
      }
    }
  })

  test("nested boxes generate proper ANSI sequences", async () => {
    const output = await renderToAnsi(
      <Box padding={2}>
        <Box style={{ border: 'single' }}>
          <Text>Content</Text>
        </Box>
      </Box>
    )

    const commands = parseAnsiSequences(output)
    
    // Should have border characters
    const textCommands = commands.filter(cmd => cmd.type === 'text')
    const hasBorder = textCommands.some(cmd => 
      cmd.text && (cmd.text.includes('┌') || cmd.text.includes('│') || cmd.text.includes('└'))
    )
    
    expect(hasBorder).toBe(true)
    
    // Content should be present
    const hasContent = textCommands.some(cmd => 
      cmd.text && cmd.text.includes('Content')
    )
    
    expect(hasContent).toBe(true)
  })

  test("justify-content affects ANSI positioning", async () => {
    const output = await renderToAnsi(
      <Row width={40} justify="end">
        <Text>End</Text>
      </Row>
    )

    const commands = parseAnsiSequences(output)
    const layout = extractLayout(commands)
    
    // Find the text containing "End"
    const endItem = layout.find(item => item.text.includes('End'))
    expect(endItem).toBeDefined()
    
    // With justify="end", text should have spaces before it
    if (endItem) {
      const endPosition = endItem.text.indexOf('End')
      expect(endPosition).toBeGreaterThan(30)
    }
  })

  test("ANSI escape sequences are well-formed", async () => {
    const output = await renderToAnsi(
      <Box>
        <Text style={{ color: 'red', bold: true }}>Styled</Text>
      </Box>
    )

    // Check for valid ANSI structure
    expect(output).toMatch(/\x1b\[/) // Has escape sequences
    
    const commands = parseAnsiSequences(output)
    
    // Should have style commands for red and bold
    const styleCommands = commands.filter(cmd => cmd.type === 'style')
    expect(styleCommands.length).toBeGreaterThan(0)
    
    // Should have the text
    const hasStyledText = commands.some(cmd => 
      cmd.type === 'text' && cmd.text?.includes('Styled')
    )
    expect(hasStyledText).toBe(true)
  })

  test("clear commands are generated for dirty regions", async () => {
    const output = await renderToAnsi(
      <Box height={3}>
        <Text>Line 1</Text>
        <Text>Line 2</Text>
      </Box>
    )

    const commands = parseAnsiSequences(output)
    
    // Should have clear commands
    const clearCommands = commands.filter(cmd => cmd.type === 'clear')
    expect(clearCommands.length).toBeGreaterThan(0)
    
    // Clear commands should be for entire lines
    const entireLineClear = clearCommands.filter(cmd => 
      cmd.command === 'entireLine'
    )
    expect(entireLineClear.length).toBeGreaterThan(0)
  })

  test("renders empty screen with just clear commands", async () => {
    const output = await renderToAnsi(
      <Box />
    )

    const commands = parseAnsiSequences(output)
    
    // Should still have initialization commands
    expect(commands.length).toBeGreaterThan(0)
    
    // Should have cursor positioning
    const cursorCommands = commands.filter(cmd => 
      cmd.type === 'cursor' && cmd.command === 'position'
    )
    expect(cursorCommands.length).toBeGreaterThan(0)
  })
})