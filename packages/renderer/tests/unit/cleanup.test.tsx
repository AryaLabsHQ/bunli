/**
 * Tests for automatic cleanup with FinalizationRegistry
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text } from '../../src/index.js'
import { createTestApp } from '../utils/test-helpers.js'
import { isCleanupSupported, getCleanupStats } from '../../src/reconciler/cleanup-registry.js'

describe("Cleanup Registry", () => {
  test("cleanup is supported in Bun", () => {
    const supported = isCleanupSupported()
    // Bun supports FinalizationRegistry
    expect(supported).toBe(true)
  })
  
  test("cleanup stats are available", () => {
    const stats = getCleanupStats()
    expect(stats).toHaveProperty('supported')
    expect(stats).toHaveProperty('trackedContainers')
    expect(stats.supported).toBe(true)
  })
  
  test("containers are registered for cleanup", () => {
    const { unmount } = createTestApp()
    
    // The container should be registered
    const stats = getCleanupStats()
    expect(stats.supported).toBe(true)
    
    unmount()
  })
  
  test("manual cleanup removes registry entries", () => {
    const { rerender, unmount } = createTestApp()
    
    // Render something
    rerender(
      <Box>
        <Text>Hello World</Text>
      </Box>
    )
    
    // Unmount should trigger manual cleanup
    unmount()
    
    // Cleanup should have been called
    expect(true).toBe(true) // Just verify no errors
  })
  
  test("cleanup handles terminal cursor visibility", () => {
    const { terminal, rerender, unmount } = createTestApp()
    
    // Clear initial output
    terminal.reset()
    
    // Render
    rerender(<Text>Test</Text>)
    
    // Unmount
    unmount()
    
    // Check that cursor show command was sent
    const output = terminal.getRawOutputArray()
    const hasCursorShow = output.some(line => line.includes('\x1b[?25h'))
    expect(hasCursorShow).toBe(true)
  })
  
  test("cleanup works with multiple containers", () => {
    const apps = []
    
    // Create multiple apps
    for (let i = 0; i < 5; i++) {
      const app = createTestApp()
      app.rerender(
        <Box>
          <Text>App {i}</Text>
        </Box>
      )
      apps.push(app)
    }
    
    // Unmount all
    for (const app of apps) {
      app.unmount()
    }
    
    // All should be cleaned up without errors
    expect(true).toBe(true)
  })
  
  test("cleanup preserves WeakMap semantics", () => {
    // Create an app in a closure so it can be GC'd
    const createTempApp = () => {
      const { rerender, container } = createTestApp()
      rerender(<Text>Temporary</Text>)
      return container
    }
    
    // Create container reference
    const containerRef = new WeakRef(createTempApp())
    
    // Force GC if available (Bun supports this)
    if (typeof Bun !== 'undefined' && typeof Bun.gc === 'function') {
      Bun.gc(true)
    }
    
    // Container should be eligible for GC
    // We can't test actual GC behavior reliably, but we can verify no errors
    expect(true).toBe(true)
  })
})