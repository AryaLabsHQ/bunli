/**
 * Performance testing utilities
 */

import React from 'react'
import { Box, Text } from '../../src/index.js'
import { createTestApp } from './test-helpers.js'

export interface PerformanceMetrics {
  renderTime: number
  layoutTime: number
  updateTime: number
  memoryUsed: number
}

/**
 * Measure differential rendering performance
 */
export function measureDifferentialPerformance(): { 
  initialRender: number
  updateRender: number 
} {
  const { terminal, rerender, unmount } = createTestApp(80, 40)
  
  const tree = (
    <Box>
      {Array.from({ length: 100 }, (_, i) => (
        <Box key={i}>
          <Text>Item {i}</Text>
        </Box>
      ))}
    </Box>
  )
  
  // Initial render
  const start1 = performance.now()
  rerender(tree)
  const initialRender = performance.now() - start1
  
  // Clear terminal tracking
  terminal.getLastUpdates()
  
  // Update render
  const updatedTree = (
    <Box>
      {Array.from({ length: 100 }, (_, i) => (
        <Box key={i}>
          <Text>Updated Item {i}</Text>
        </Box>
      ))}
    </Box>
  )
  
  const start2 = performance.now()
  rerender(updatedTree)
  const updateRender = performance.now() - start2
  
  unmount()
  
  return { initialRender, updateRender }
}

/**
 * Create a large tree for performance testing
 */
export function createPerformanceTree(options: {
  breadth: number
  depth: number
  withStyles?: boolean
}): React.ReactElement {
  const { breadth, depth, withStyles = false } = options
  
  function createNode(currentDepth: number): React.ReactElement {
    if (currentDepth === 0) {
      return (
        <Text style={withStyles ? { color: 'green' } : undefined}>
          Leaf at depth {depth - currentDepth}
        </Text>
      )
    }
    
    return (
      <Box 
        style={withStyles ? { 
          border: 'single',
          padding: 1 
        } : undefined}
      >
        {Array.from({ length: breadth }, (_, i) => (
          <Box key={i}>
            {createNode(currentDepth - 1)}
          </Box>
        ))}
      </Box>
    )
  }
  
  return createNode(depth)
}

/**
 * Benchmark a render operation
 */
export function benchmark(
  name: string,
  fn: () => void,
  iterations = 100
): { mean: number; min: number; max: number; stdDev: number } {
  const times: number[] = []
  
  // Warmup
  for (let i = 0; i < 10; i++) {
    fn()
  }
  
  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    times.push(performance.now() - start)
  }
  
  const mean = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  
  const variance = times.reduce((sum, time) => {
    const diff = time - mean
    return sum + diff * diff
  }, 0) / times.length
  
  const stdDev = Math.sqrt(variance)
  
  return { mean, min, max, stdDev }
}

/**
 * Profile memory usage during rendering
 */
export async function profileMemory(
  fn: () => void,
  samples = 10
): Promise<{ initial: number; peak: number; final: number }> {
  // Force GC if available
  if (global.gc) global.gc()
  
  const initial = process.memoryUsage().heapUsed
  let peak = initial
  
  for (let i = 0; i < samples; i++) {
    fn()
    
    const current = process.memoryUsage().heapUsed
    peak = Math.max(peak, current)
    
    // Small delay between samples
    await new Promise(resolve => setImmediate(resolve))
  }
  
  if (global.gc) global.gc()
  const final = process.memoryUsage().heapUsed
  
  return { initial, peak, final }
}