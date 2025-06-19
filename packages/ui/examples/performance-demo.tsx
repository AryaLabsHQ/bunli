#!/usr/bin/env bun
/**
 * Performance Demo
 * 
 * This example demonstrates the performance characteristics of Bunli UI:
 * - Differential rendering (only updates changed parts)
 * - Handling rapid updates efficiently
 * - Multiple animated components
 * - Rendering metrics display
 */

import React, { useState, useEffect } from 'react'
import { createApp, Box, Text, Row, Column, ProgressBar } from '../src/index.js'
import { getRenderingMetrics } from '../src/reconciler/terminal-renderer.js'

// Component that updates very frequently
function RapidCounter({ label, interval = 50 }: { label: string; interval?: number }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1)
    }, interval)
    
    return () => clearInterval(timer)
  }, [interval])
  
  return (
    <Box style={{ padding: 1 }}>
      <Text style={{ color: 'cyan' }}>{label}: {count}</Text>
    </Box>
  )
}

// Animated progress bars
function AnimatedProgress({ label, speed = 0.01 }: { label: string; speed?: number }) {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        const next = p + speed
        return next > 1 ? 0 : next
      })
    }, 50)
    
    return () => clearInterval(timer)
  }, [speed])
  
  return (
    <Box marginBottom={1}>
      <Text>{label}</Text>
      <ProgressBar value={progress} width={30} />
    </Box>
  )
}

// Static content that shouldn't re-render
function StaticContent() {
  return (
    <Box style={{ border: 'double', padding: 1, marginBottom: 1 }} width={40}>
      <Text style={{ color: 'yellow', bold: true }}>Static Content</Text>
      <Text>This component should not re-render</Text>
      <Text>when other components update.</Text>
      <Text style={{ color: 'gray' }}>
        Watch the render metrics below!
      </Text>
    </Box>
  )
}

// Main performance demo component
function PerformanceDemo() {
  const [showMetrics, setShowMetrics] = useState(true)
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    coverage: 0,
  })
  
  // Update metrics every 100ms
  useEffect(() => {
    const timer = setInterval(() => {
      const m = getRenderingMetrics()
      if (m) {
        setMetrics({
          renderCount: m.renderCount,
          lastRenderTime: m.lastRenderTime,
          averageRenderTime: m.averageRenderTime,
          coverage: Math.round(m.dirtyRegionStats.coverage * 100),
        })
      }
    }, 100)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <Box padding={2}>
      <Text style={{ fontSize: 'large', bold: true, marginBottom: 1 }}>
        Bunli UI Performance Demo
      </Text>
      
      <Row gap={2}>
        {/* Left column - Static content */}
        <Column flex={1}>
          <StaticContent />
          
          {/* Multiple progress bars */}
          <Box style={{ border: 'single', padding: 1 }} width={40}>
            <Text style={{ bold: true, marginBottom: 1 }}>Animated Progress Bars</Text>
            <AnimatedProgress label="Task 1" speed={0.02} />
            <AnimatedProgress label="Task 2" speed={0.015} />
            <AnimatedProgress label="Task 3" speed={0.025} />
          </Box>
        </Column>
        
        {/* Right column - Rapid counters */}
        <Column flex={1}>
          <Box style={{ border: 'single', padding: 1, marginBottom: 1 }} width={30}>
            <Text style={{ bold: true }}>Rapid Counters</Text>
            <Text style={{ color: 'gray', fontSize: 'small' }}>
              Updates every 50-200ms
            </Text>
            <RapidCounter label="Fast Counter" interval={50} />
            <RapidCounter label="Medium Counter" interval={100} />
            <RapidCounter label="Slow Counter" interval={200} />
          </Box>
          
          {/* Performance metrics */}
          {showMetrics && (
            <Box style={{ border: 'single', padding: 1 }} width={30}>
              <Text style={{ bold: true, color: 'green' }}>Rendering Metrics</Text>
              <Text>Render count: {metrics.renderCount}</Text>
              <Text>Last render: {metrics.lastRenderTime.toFixed(2)}ms</Text>
              <Text>Avg render: {metrics.averageRenderTime.toFixed(2)}ms</Text>
              <Text style={{ color: 'cyan' }}>
                Dirty region coverage: {metrics.coverage}%
              </Text>
            </Box>
          )}
        </Column>
      </Row>
      
      <Box marginTop={1}>
        <Text style={{ color: 'gray' }}>
          Notice how only changing parts are re-rendered (high optimization rate)
        </Text>
        <Text style={{ color: 'gray' }}>
          Press Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  )
}

// Create and render the app
const app = createApp(<PerformanceDemo />)
app.render()

console.log('Performance demo started. Watch the optimization rate!')