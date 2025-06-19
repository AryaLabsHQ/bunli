/**
 * Test helpers for @bunli/renderer
 */

import React from 'react'
import { render, unmount, createApp } from '../../src/index.js'
import type { TerminalApp } from '../../src/index.js'
import { createTerminalContainer } from '../../src/reconciler/terminal-element.js'
import { MockTerminal } from './mock-terminal.js'
import { registerApp } from '../setup.js'

export interface TestApp {
  app: TerminalApp
  terminal: MockTerminal
  container: any
  rerender: (element: React.ReactElement) => void
  unmount: () => void
}

/**
 * Create a test app with mock terminal
 */
export function createTestApp(width = 80, height = 24): TestApp {
  const terminal = new MockTerminal(width, height)
  
  // Create a mock stream
  const mockStream: any = {
    write: (data: any) => {
      terminal.write(data.toString())
      return true
    },
    columns: width,
    rows: height,
    on: () => {},
    off: () => {},
    removeListener: () => {},
    once: () => {},
  }
  
  // Create the container directly instead of using createApp
  const container = createTerminalContainer(mockStream)
  
  // Hide cursor like createApp does
  mockStream.write('\x1b[?25l')
  
  // Store current element for render()
  let currentElement: React.ReactElement | null = null
  
  const testApp: TestApp = {
    app: { 
      render: () => {
        if (currentElement) {
          render(currentElement, container)
        }
      },
      unmount: () => {
        unmount(container)
        mockStream.write('\x1b[?25h') // Show cursor
      },
      container 
    },
    terminal,
    container,
    rerender: (element: React.ReactElement) => {
      currentElement = element
      render(element, container)
    },
    unmount: () => {
      unmount(container)
      mockStream.write('\x1b[?25h') // Show cursor
    }
  }
  
  registerApp(testApp)
  
  return testApp
}

/**
 * Render a component to string (for snapshot testing)
 */
export function renderToString(element: React.ReactElement, width = 80, height = 24): string {
  const { terminal, rerender, unmount } = createTestApp(width, height)
  
  rerender(element)
  
  // For synchronous tests, we'll access the rendered content immediately
  // The render may not be complete, but for simple cases it should work
  const output = terminal.getRenderedContent()
  unmount()
  
  return output
}

/**
 * Act wrapper for synchronous updates
 */
export function act(callback: () => void): void {
  // For now, just execute synchronously
  // In future, might need to handle React's act
  callback()
}

/**
 * Wait for next render cycle
 */
export async function waitForRender(): Promise<void> {
  // Wait multiple ticks to ensure React has flushed
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setTimeout(resolve, 10))
}

/**
 * Render a component to string asynchronously (waits for React to flush)
 */
export async function renderToStringAsync(element: React.ReactElement, width = 80, height = 24): Promise<string> {
  const { terminal, rerender, unmount, container } = createTestApp(width, height)
  
  rerender(element)
  
  // Wait for React to flush updates
  await waitForRender()
  
  // Force layout calculation and rendering
  if (container && container.root) {
    const { performLayout } = require('../../src/reconciler/layout.js')
    const { renderToTerminal } = require('../../src/reconciler/terminal-renderer.js')
    
    performLayout(container)
    renderToTerminal(container)
  }
  
  const output = terminal.getRenderedContent()
  unmount()
  
  return output
}

/**
 * Measure render time
 */
export function measureRenderTime(element: React.ReactElement): number {
  const start = performance.now()
  const { rerender, unmount } = createTestApp()
  
  rerender(element)
  const end = performance.now()
  
  unmount()
  return end - start
}

/**
 * Render a component to raw ANSI string for snapshot testing
 */
export async function renderToSnapshot(element: React.ReactElement, width = 80, height = 24): Promise<string> {
  const { terminal, rerender, unmount, container } = createTestApp(width, height)
  
  rerender(element)
  
  // Wait for React to flush updates
  await waitForRender()
  
  // Force layout calculation and rendering
  if (container && container.root) {
    const { performLayout } = require('../../src/reconciler/layout.js')
    const { renderToTerminal } = require('../../src/reconciler/terminal-renderer.js')
    
    performLayout(container)
    renderToTerminal(container)
  }
  
  const output = terminal.getRawOutput()
  unmount()
  
  return output
}

/**
 * Create a test element
 */
export function createTestElement(props: any): any {
  // This creates a mock element structure for unit testing
  return {
    type: 'box',
    props,
    children: props.children || [],
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    style: props.style || {},
    layoutDirty: true,
    _fiber: null
  }
}