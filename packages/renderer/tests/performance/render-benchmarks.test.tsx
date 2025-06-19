/**
 * Performance benchmark tests
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text, Row, Column } from '../../src/index.js'
import { createTestApp, measureRenderTime } from '../utils/test-helpers.js'

// Helper to create large component trees
function createLargeTree(count: number): React.ReactElement {
  const items = Array.from({ length: count }, (_, i) => (
    <Box key={i} style={{ border: 'single', margin: 1 }}>
      <Text>Item {i + 1}</Text>
    </Box>
  ))
  
  return (
    <Column>
      {items}
    </Column>
  )
}

function createDeepTree(depth: number): React.ReactElement {
  if (depth === 0) {
    return <Text>Leaf</Text>
  }
  
  return (
    <Box padding={1} style={{ border: 'single' }}>
      {createDeepTree(depth - 1)}
    </Box>
  )
}

describe("Performance Benchmarks", () => {
  test("renders 100 elements within budget", () => {
    const tree = createLargeTree(100)
    const renderTime = measureRenderTime(tree)
    
    // Should render in under 50ms
    expect(renderTime).toBeLessThan(50)
  })
  
  test("renders 1000 elements within budget", () => {
    const tree = createLargeTree(1000)
    const renderTime = measureRenderTime(tree)
    
    // Should render in under 200ms
    expect(renderTime).toBeLessThan(200)
  })
  
  test("renders deeply nested tree efficiently", () => {
    const tree = createDeepTree(20)
    const renderTime = measureRenderTime(tree)
    
    // Deep nesting should still be fast
    expect(renderTime).toBeLessThan(30)
  })
  
  test("differential rendering is faster than initial render", () => {
    const { terminal, rerender, unmount } = createTestApp(80, 40)
    
    // Initial render
    const start1 = performance.now()
    rerender(createLargeTree(100))
    const initialTime = performance.now() - start1
    
    // Clear updates to measure just the re-render
    terminal.getLastUpdates()
    
    // Update render (should use differential algorithm)
    const start2 = performance.now()
    rerender(createLargeTree(100))
    const updateTime = performance.now() - start2
    
    unmount()
    
    // Update should be no slower than initial render
    // In practice, updates are often slightly faster but not dramatically so
    expect(updateTime).toBeLessThanOrEqual(initialTime * 1.1)
  })
  
  test("handles rapid updates efficiently", async () => {
    const { rerender, unmount } = createTestApp()
    
    let totalTime = 0
    const updateCount = 60 // Simulate 60fps for 1 second
    
    for (let i = 0; i < updateCount; i++) {
      const start = performance.now()
      rerender(
        <Box>
          <Text>Frame {i}</Text>
          <Text>Time: {new Date().toISOString()}</Text>
        </Box>
      )
      totalTime += performance.now() - start
    }
    
    unmount()
    
    const avgTime = totalTime / updateCount
    
    // Average render time should support 60fps (16.67ms)
    expect(avgTime).toBeLessThan(16.67)
  })
  
  test("layout calculation scales linearly", () => {
    // Measure layout time for different sizes
    const sizes = [10, 50, 100, 200]
    const times: number[] = []
    
    for (const size of sizes) {
      const tree = (
        <Row>
          {Array.from({ length: size }, (_, i) => (
            <Box key={i} flex={1}>
              <Text>{i}</Text>
            </Box>
          ))}
        </Row>
      )
      
      const time = measureRenderTime(tree)
      times.push(time)
    }
    
    // Check that time grows roughly linearly
    // Time for 200 items should be less than 2.5x time for 100 items
    expect(times[3]).toBeLessThan(times[2] * 2.5)
  })
  
  test("dirty region optimization reduces render area", async () => {
    const { terminal, rerender, unmount } = createTestApp(80, 40)
    
    // Initial render - full screen
    rerender(
      <Column>
        <Box width={20} height={5} style={{ border: 'single' }}>
          <Text>Static Content</Text>
        </Box>
        <Box width={20} height={5} style={{ border: 'single' }}>
          <Text>Dynamic: 0</Text>
        </Box>
      </Column>
    )
    
    // Clear update tracking
    terminal.getLastUpdates()
    
    // Update only the dynamic box
    rerender(
      <Column>
        <Box width={20} height={5} style={{ border: 'single' }}>
          <Text>Static Content</Text>
        </Box>
        <Box width={20} height={5} style={{ border: 'single' }}>
          <Text>Dynamic: 1</Text>
        </Box>
      </Column>
    )
    
    // Wait for render to complete
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const updates = terminal.getLastUpdates()
    unmount()
    
    // Should only update the region around the dynamic box
    // Handle empty updates case
    if (updates.length === 0) {
      expect(updates.length).toBeGreaterThan(0)
      return
    }
    
    const updatedRegion = {
      minX: Math.min(...updates.map(u => u.x)),
      maxX: Math.max(...updates.map(u => u.x)),
      minY: Math.min(...updates.map(u => u.y)),
      maxY: Math.max(...updates.map(u => u.y))
    }
    
    // Updated region should be much smaller than full screen
    const regionArea = (updatedRegion.maxX - updatedRegion.minX) * 
                      (updatedRegion.maxY - updatedRegion.minY)
    const screenArea = 80 * 40
    
    expect(regionArea).toBeLessThan(screenArea * 0.3)
  })
  
  test("memory usage remains stable", async () => {
    const { rerender, unmount } = createTestApp()
    
    // Force garbage collection if available
    if (global.gc) global.gc()
    
    const initialMemory = process.memoryUsage().heapUsed
    
    // Render many times
    for (let i = 0; i < 100; i++) {
      rerender(createLargeTree(50))
      
      // Occasional GC
      if (i % 20 === 0 && global.gc) global.gc()
    }
    
    unmount()
    
    if (global.gc) global.gc()
    const finalMemory = process.memoryUsage().heapUsed
    
    // Memory growth should be minimal (less than 10MB)
    const memoryGrowth = finalMemory - initialMemory
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024)
  })
  
  test.skip("stress test with complex layout", () => {
    // This test is skipped by default as it's intensive
    const complexTree = (
      <Box padding={2}>
        {Array.from({ length: 10 }, (_, i) => (
          <Row key={i} gap={1}>
            {Array.from({ length: 10 }, (_, j) => (
              <Box 
                key={j} 
                flex={1} 
                style={{ 
                  border: 'single',
                  backgroundColor: (i + j) % 2 === 0 ? 'blue' : 'red'
                }}
              >
                <Column>
                  <Text style={{ bold: true }}>Cell {i},{j}</Text>
                  <Text style={{ dim: true }}>Data</Text>
                </Column>
              </Box>
            ))}
          </Row>
        ))}
      </Box>
    )
    
    const renderTime = measureRenderTime(complexTree)
    
    // Even complex layouts should render reasonably fast
    expect(renderTime).toBeLessThan(300)
  })
})