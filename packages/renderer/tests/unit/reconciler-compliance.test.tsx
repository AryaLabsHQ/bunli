/**
 * React Reconciler compliance tests
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text } from '../../src/index.js'
import { createTestApp, waitForRender } from '../utils/test-helpers.js'

describe("React Reconciler Host Config", () => {
  test("creates and renders elements", async () => {
    const { terminal, rerender } = createTestApp(20, 5)
    
    rerender(
      <Box>
        <Text>Hello World</Text>
      </Box>
    )
    
    await waitForRender()
    const content = terminal.getRenderedContent()
    expect(content).toContain("Hello World")
  })
  
  test("updates text content", async () => {
    const { terminal, rerender } = createTestApp(20, 5)
    
    // Initial render
    rerender(<Text>Initial</Text>)
    await waitForRender()
    expect(terminal.getRenderedContent()).toContain("Initial")
    
    // Update
    rerender(<Text>Updated</Text>)
    await waitForRender()
    
    expect(terminal.getRenderedContent()).toContain("Updated")
    expect(terminal.getRenderedContent()).not.toContain("Initial")
  })
  
  test("adds and removes children", async () => {
    const { terminal, rerender } = createTestApp(30, 10)
    
    // Start with one child
    rerender(
      <Box>
        <Text>Child 1</Text>
      </Box>
    )
    
    await waitForRender()
    expect(terminal.getRenderedContent()).toContain("Child 1")
    
    // Add second child
    rerender(
      <Box>
        <Text>Child 1</Text>
        <Text>Child 2</Text>
      </Box>
    )
    
    await waitForRender()
    const content = terminal.getRenderedContent()
    expect(content).toContain("Child 1")
    expect(content).toContain("Child 2")
    
    // Remove first child
    rerender(
      <Box>
        <Text>Child 2</Text>
      </Box>
    )
    
    await waitForRender()
    const finalContent = terminal.getRenderedContent()
    expect(finalContent).not.toContain("Child 1")
    expect(finalContent).toContain("Child 2")
  })
  
  test("updates element props", async () => {
    const { terminal, rerender } = createTestApp(40, 10)
    
    // Initial render with width
    rerender(
      <Box width={10} style={{ border: 'single' }}>
        <Text>Border Box</Text>
      </Box>
    )
    
    await waitForRender()
    const initialContent = terminal.getRenderedContent()
    const initialBorderChars = (initialContent.match(/[─│┌┐└┘]/g) || []).length
    
    // Update width
    rerender(
      <Box width={20} style={{ border: 'single' }}>
        <Text>Border Box</Text>
      </Box>
    )
    await waitForRender()
    
    // Border should be wider now
    const updatedContent = terminal.getRenderedContent()
    const updatedBorderChars = (updatedContent.match(/[─│┌┐└┘]/g) || []).length
    
    expect(updatedBorderChars).toBeGreaterThan(initialBorderChars)
  })
  
  test("handles style updates", async () => {
    const { terminal, rerender } = createTestApp(30, 5)
    
    // Initial render without style
    rerender(<Text>Plain Text</Text>)
    await waitForRender()
    terminal.getRawOutputArray() // Clear raw output
    
    // Render with color style
    rerender(<Text style={{ color: 'red' }}>Styled Text</Text>)
    await waitForRender()
    const styledOutput = terminal.getRawOutput()
    
    // Should contain ANSI color codes
    expect(styledOutput).toContain('\x1b[31m') // Red color code
  })
  
  test("preserves element identity with keys", async () => {
    const { terminal, rerender } = createTestApp(40, 10)
    
    const items = ['A', 'B', 'C']
    
    // Initial render
    rerender(
      <Box>
        {items.map(item => (
          <Text key={item}>{item}</Text>
        ))}
      </Box>
    )
    
    await waitForRender()
    const initialContent = terminal.getRenderedContent().split('\n').filter(line => line.trim())
    expect(initialContent).toEqual(['A', 'B', 'C'])
    
    // Reorder items
    const reorderedItems = ['C', 'A', 'B']
    rerender(
      <Box>
        {reorderedItems.map(item => (
          <Text key={item}>{item}</Text>
        ))}
      </Box>
    )
    
    await waitForRender()
    const reorderedContent = terminal.getRenderedContent().split('\n').filter(line => line.trim())
    expect(reorderedContent).toEqual(['C', 'A', 'B'])
  })
  
  test("handles conditional rendering", async () => {
    const { terminal, rerender } = createTestApp(30, 10)
    
    let showConditional = true
    
    const App = () => (
      <Box>
        <Text>Always visible</Text>
        {showConditional && <Text>Conditional</Text>}
      </Box>
    )
    
    // Render with conditional content
    rerender(<App />)
    await waitForRender()
    expect(terminal.getRenderedContent()).toContain("Always visible")
    expect(terminal.getRenderedContent()).toContain("Conditional")
    
    // Update to hide conditional content
    showConditional = false
    rerender(<App />)
    await waitForRender()
    const content = terminal.getRenderedContent()
    expect(content).toContain("Always visible")
    expect(content).not.toContain("Conditional")
  })
  
  test("handles fragments", async () => {
    const { terminal, rerender } = createTestApp(30, 10)
    
    rerender(
      <Box>
        <>
          <Text>First</Text>
          <Text>Second</Text>
        </>
        <React.Fragment>
          <Text>Third</Text>
          <Text>Fourth</Text>
        </React.Fragment>
      </Box>
    )
    
    await waitForRender()
    const content = terminal.getRenderedContent()
    expect(content).toContain("First")
    expect(content).toContain("Second")
    expect(content).toContain("Third")
    expect(content).toContain("Fourth")
  })
  
  test("unmounts components cleanly", async () => {
    const { terminal, rerender, unmount } = createTestApp(30, 10)
    
    rerender(
      <Box>
        <Text>Hello World</Text>
      </Box>
    )
    
    await waitForRender()
    expect(terminal.getRenderedContent()).toContain("Hello World")
    
    // Unmount
    unmount()
    await waitForRender()
    
    // Terminal should be cleared after unmount
    // Check that the output contains clear screen sequence
    const rawOutput = terminal.getRawOutputArray()
    const hasHomeAndClear = rawOutput.some(output => 
      output.includes('\x1b[H') && output.includes('\x1b[2J')
    )
    expect(hasHomeAndClear).toBe(true)
  })
})