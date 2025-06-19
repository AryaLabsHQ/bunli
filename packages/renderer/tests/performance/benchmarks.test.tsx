/**
 * Performance benchmarks for @bunli/renderer
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text, Row, Column } from '../../src/index.js'
import { createTestApp, waitForRender } from '../utils/test-helpers.js'
import { stylesEqual } from '../../src/utils/style-utils.js'
import { now } from '../../src/utils/performance.js'

describe("Performance Benchmarks", () => {
  test("render performance scales linearly", async () => {
    const sizes = [100, 500, 1000, 2000]
    const results: Array<{ size: number; time: number }> = []
    
    for (const size of sizes) {
      const { rerender, unmount } = createTestApp(100, 50)
      
      const start = now()
      rerender(
        <Column>
          {Array.from({ length: size }, (_, i) => (
            <Box key={i} padding={1}>
              <Text>Item {i}</Text>
            </Box>
          ))}
        </Column>
      )
      await waitForRender()
      const time = now() - start
      
      results.push({ size, time })
      unmount()
    }
    
    // Log results
    console.log("\nRender Performance:")
    results.forEach(({ size, time }) => {
      console.log(`  ${size} elements: ${time.toFixed(2)}ms`)
    })
    
    // Check scaling is reasonable
    const firstTime = results[0].time
    const lastTime = results[results.length - 1].time
    const firstSize = results[0].size
    const lastSize = results[results.length - 1].size
    const expectedScaling = lastSize / firstSize
    const actualScaling = lastTime / firstTime
    
    // Should scale sub-linearly (better than linear)
    expect(actualScaling).toBeLessThan(expectedScaling * 2)
  })
  
  test("style comparison is optimized", () => {
    const style1 = { color: 'red', bold: true, backgroundColor: 'blue' }
    const style2 = { color: 'red', bold: true, backgroundColor: 'blue' }
    const style3 = { color: 'green', bold: false }
    
    const iterations = 50000
    
    // Measure JSON.stringify
    const jsonStart = now()
    for (let i = 0; i < iterations; i++) {
      JSON.stringify(style1) === JSON.stringify(style2)
      JSON.stringify(style1) === JSON.stringify(style3)
    }
    const jsonTime = now() - jsonStart
    
    // Measure shallow equals
    const shallowStart = now()
    for (let i = 0; i < iterations; i++) {
      stylesEqual(style1, style2)
      stylesEqual(style1, style3)
    }
    const shallowTime = now() - shallowStart
    
    const speedup = jsonTime / shallowTime
    
    console.log(`\nStyle Comparison (${iterations.toLocaleString()} iterations):`)
    console.log(`  JSON.stringify: ${jsonTime.toFixed(2)}ms`)
    console.log(`  Shallow equals: ${shallowTime.toFixed(2)}ms`)
    console.log(`  Speedup: ${speedup.toFixed(1)}x faster`)
    
    expect(speedup).toBeGreaterThan(5)
  })
  
  test("differential updates are efficient", async () => {
    const { rerender, unmount } = createTestApp(80, 40)
    const itemCount = 500
    
    // Initial render
    const initialItems = Array.from({ length: itemCount }, (_, i) => ({
      key: i,
      text: `Item ${i}`
    }))
    
    rerender(
      <Column>
        {initialItems.map(item => (
          <Text key={item.key}>{item.text}</Text>
        ))}
      </Column>
    )
    await waitForRender()
    
    // Update single item
    const updatedItems = [...initialItems]
    updatedItems[250] = { key: 250, text: 'UPDATED ITEM' }
    
    const start = now()
    rerender(
      <Column>
        {updatedItems.map(item => (
          <Text key={item.key}>{item.text}</Text>
        ))}
      </Column>
    )
    await waitForRender()
    const updateTime = now() - start
    
    console.log(`\nDifferential Update:`)
    console.log(`  Update 1 of ${itemCount} items: ${updateTime.toFixed(2)}ms`)
    
    // Should be much faster than initial render
    expect(updateTime).toBeLessThan(30)
    
    unmount()
  })
  
  test("memory usage remains stable", async () => {
    if (!Bun.gc) {
      console.log("\nSkipping memory test (Bun.gc not available)")
      return
    }
    
    const { rerender, unmount } = createTestApp()
    
    // Baseline
    Bun.gc(true)
    const baseline = process.memoryUsage().heapUsed / 1024 / 1024
    
    // Render multiple times
    const renderCount = 30
    for (let i = 0; i < renderCount; i++) {
      rerender(
        <Box>
          {Array.from({ length: 100 }, (_, j) => (
            <Text key={j}>Render {i} Item {j}</Text>
          ))}
        </Box>
      )
      await waitForRender()
    }
    
    // Measure after GC
    Bun.gc(true)
    const after = process.memoryUsage().heapUsed / 1024 / 1024
    const growth = after - baseline
    
    console.log(`\nMemory Usage:`)
    console.log(`  After ${renderCount} renders: +${growth.toFixed(2)}MB`)
    
    // Should not leak significant memory
    expect(growth).toBeLessThan(5)
    
    unmount()
  })
  
  test("layout performance with flex", async () => {
    const { rerender, unmount } = createTestApp(120, 50)
    
    const start = now()
    rerender(
      <Row height="100%" gap={2}>
        <Column flex={1} gap={1}>
          {Array.from({ length: 20 }, (_, i) => (
            <Box key={i} flex={i === 10 ? 2 : 1} style={{ border: 'single' }}>
              <Text>Flex item {i}</Text>
            </Box>
          ))}
        </Column>
        <Box flex={2} style={{ border: 'double' }} padding={2}>
          <Text wrap="wrap">
            This is the main content area with longer text that should wrap properly
            within the boundaries of the flex container.
          </Text>
        </Box>
      </Row>
    )
    await waitForRender()
    const time = now() - start
    
    console.log(`\nComplex Layout:`)
    console.log(`  Flex layout with 20+ elements: ${time.toFixed(2)}ms`)
    
    expect(time).toBeLessThan(50)
    
    unmount()
  })
})

// Optional stress tests (skipped by default)
describe.skip("Stress Tests", () => {
  test("renders 10000 elements", async () => {
    const { rerender, unmount } = createTestApp(200, 100)
    
    const start = now()
    rerender(
      <Box>
        {Array.from({ length: 10000 }, (_, i) => (
          <Text key={i}>Element {i}</Text>
        ))}
      </Box>
    )
    await waitForRender()
    const time = now() - start
    
    console.log(`\nStress Test: 10000 elements in ${time.toFixed(2)}ms`)
    
    unmount()
  })
})