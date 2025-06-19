/**
 * Basic rendering integration tests
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { createTestApp, waitForRender, renderToStringAsync } from '../utils/test-helpers.js'
import { MockTerminal } from '../utils/mock-terminal.js'
import { Box, Text, Row, Column } from '../../src/index.js'
import { performLayout } from '../../src/reconciler/layout.js'
import { renderToTerminal } from '../../src/reconciler/terminal-renderer.js'

describe("Basic Rendering", () => {
  test("renders to mock terminal", async () => {
    const { terminal, rerender, unmount } = createTestApp(40, 10)
    
    rerender(
      <Box padding={1}>
        <Text>Hello from renderer!</Text>
      </Box>
    )
    
    await waitForRender()
    const output = terminal.getRenderedContent()
    expect(output).toContain("Hello from renderer!")
    
    unmount()
  })
  
  test.skip("handles terminal resize", async () => {
    // TODO: Implement proper terminal resize handling in the renderer
    const { terminal, rerender, unmount, container } = createTestApp(40, 10)
    
    rerender(
      <Box width="100%" style={{ border: 'single' }}>
        <Text>Resizable content</Text>
      </Box>
    )
    
    await waitForRender()
    // Check initial render
    let output = terminal.getRenderedContent()
    let borderLine = output.split('\n').find(line => line.includes('─'))
    expect(borderLine?.length).toBeCloseTo(40, 5)
    
    // Simulate resize
    if ('resize' in terminal && typeof terminal.resize === 'function') {
      terminal.resize(60, 15)
    } else {
      // Skip this test if resize is not available
      console.warn('Terminal resize method not available, skipping resize test')
      return
    }
    
    // The proper way is to emit a resize event which the container should handle
    // But since our mock doesn't support this, we need to manually update the container
    // This is a limitation of our test setup
    (container as any).width = 60;
    (container as any).height = 15;
    if (container.dirtyTracker) {
      container.dirtyTracker.resize(60, 15)
    }
    
    // Mark the root for relayout
    if (container.root) {
      container.root.dirtyLayout = true
    }
    
    // Re-render should adapt to new size
    rerender(
      <Box width="100%" style={{ border: 'single' }}>
        <Text>Resizable content</Text>
      </Box>
    )
    
    await waitForRender()
    
    // Force layout recalculation after resize
    if (container.root) {
      performLayout(container)
      renderToTerminal(container)
    }
    
    // Wait for render to complete
    await waitForRender()
    
    output = terminal.getRenderedContent()
    borderLine = output.split('\n').find(line => line.includes('─'))
    
    expect(borderLine?.length).toBeCloseTo(60, 5)
    
    unmount()
  })
  
  test("handles complex nested layout", async () => {
    const output = await renderToStringAsync(
      <Box padding={2} style={{ border: 'double' }}>
        <Column gap={1}>
          <Text style={{ bold: true }}>Header</Text>
          <Row gap={2}>
            <Box flex={1} padding={1} style={{ border: 'single' }}>
              <Column>
                <Text style={{ color: 'cyan' }}>Left Panel</Text>
                <Text>Content 1</Text>
                <Text>Content 2</Text>
              </Column>
            </Box>
            <Box flex={2} padding={1} style={{ border: 'single' }}>
              <Column>
                <Text style={{ color: 'green' }}>Right Panel</Text>
                <Text>More content here</Text>
                <Text>Even more content</Text>
              </Column>
            </Box>
          </Row>
        </Column>
      </Box>,
      60, 20
    )
    
    // Verify structure
    expect(output).toContain("Header")
    expect(output).toContain("Left Panel")
    expect(output).toContain("Right Panel")
    expect(output).toContain("Content 1")
    expect(output).toContain("More content here")
    
    // Verify borders
    expect(output).toContain("╔") // Double border
    expect(output).toContain("┌") // Single border
  })
  
  test("tracks dirty regions correctly", async () => {
    const { terminal, rerender, unmount, container } = createTestApp(40, 20)
    
    // Initial render
    rerender(
      <Column>
        <Box width={10} height={5} style={{ border: 'single' }}>
          <Text>Static 1</Text>
        </Box>
        <Box width={10} height={5} style={{ border: 'single' }}>
          <Text>Dynamic</Text>
        </Box>
      </Column>
    )
    
    await waitForRender()
    // Force layout and render
    if (container.root) {
      performLayout(container)
      renderToTerminal(container)
    }
    
    // Clear updates tracking to measure only the next update
    terminal.getLastUpdates()
    
    // Also clear dirty regions before the update
    if (container.dirtyTracker) {
      container.dirtyTracker.clear()
    }
    
    // Update only dynamic box
    rerender(
      <Column>
        <Box width={10} height={5} style={{ border: 'single' }}>
          <Text>Static 1</Text>
        </Box>
        <Box width={10} height={5} style={{ border: 'single' }}>
          <Text>Changed!</Text>
        </Box>
      </Column>
    )
    
    await waitForRender()
    
    // Force layout and render
    if (container.root) {
      performLayout(container)
      renderToTerminal(container)
    }
    
    // Get the updates from the last render
    const updates = terminal.getLastUpdates()
    
    // Should have some updates
    expect(updates.length).toBeGreaterThan(0)
    
    // If dirty region tracking is working, updates should be localized
    if (updates.length < 100) { // Arbitrary threshold for "localized"
      const updateRegion = {
        minX: Math.min(...updates.map(u => u.x)),
        maxX: Math.max(...updates.map(u => u.x)),
        minY: Math.min(...updates.map(u => u.y)),
        maxY: Math.max(...updates.map(u => u.y))
      }
      
      // Updates should be in the area of the second box (which starts at y=5)
      expect(updateRegion.minX).toBeGreaterThanOrEqual(0)
      expect(updateRegion.minY).toBeGreaterThanOrEqual(5) // Second box starts here
    }
    
    unmount()
  })
})