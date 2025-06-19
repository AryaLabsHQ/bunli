#!/usr/bin/env bun
/**
 * Bunli Integration Example
 * 
 * This example demonstrates how to integrate Bunli UI with Bunli commands:
 * - Creating stateful UI components for CLI commands
 * - Using hooks for state management
 * - Showing progress and status updates
 * - Handling async operations with UI feedback
 * - Creating reusable UI components
 * 
 * In a real Bunli application, this would be part of a command definition
 */

import React from 'react'
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { createApp, Box, Text, useState, useEffect, styles } from '../src/index.js'
import type { FC } from 'react'

// Build status component
const BuildProgress: FC<{ 
  onComplete: () => void 
}> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Initializing...')
  
  useEffect(() => {
    const steps = [
      { progress: 20, status: 'Compiling TypeScript...' },
      { progress: 40, status: 'Bundling modules...' },
      { progress: 60, status: 'Optimizing output...' },
      { progress: 80, status: 'Running tests...' },
      { progress: 100, status: 'Build complete!' }
    ]
    
    let currentStep = 0
    const timer = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep]
        setProgress(step.progress)
        setStatus(step.status)
        currentStep++
      } else {
        clearInterval(timer)
        setTimeout(onComplete, 1000)
      }
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <Box padding={2} style={{ border: 'round' }}>
      <Text style={styles.title}>🚀 Building Project</Text>
      
      <Box margin={[1, 0]}>
        <Text>Progress: {progress}%</Text>
        <Box style={{ width: 40 }}>
          <Text style={{ color: 'blue' }}>
            {'█'.repeat(Math.floor(progress / 100 * 40))}
            <Text style={{ color: 'gray' }}>
              {'░'.repeat(40 - Math.floor(progress / 100 * 40))}
            </Text>
          </Text>
        </Box>
      </Box>
      
      <Text style={styles.dim}>{status}</Text>
    </Box>
  )
}

// Example Bunli command that uses the UI
export const buildCommand = defineCommand({
  name: 'build',
  description: 'Build the project with a nice UI',
  
  options: {
    watch: option(
      z.boolean().optional(),
      { description: 'Watch for changes', short: 'w' }
    )
  },
  
  handler: async ({ flags }) => {
    // Create the UI app
    const app = createApp(
      <BuildProgress 
        onComplete={() => {
          app.unmount()
          console.log('✅ Build completed successfully!')
          process.exit(0)
        }}
      />
    )
    
    // Start rendering
    app.render()
    
    // In a real scenario, you would:
    // 1. Start the actual build process
    // 2. Update the UI based on build events
    // 3. Handle errors and show them in the UI
    
    // For watch mode, you could keep the UI running
    if (flags.watch) {
      // Set up file watcher
      // Update UI on file changes
    }
  }
})

// Interactive dashboard command
const Dashboard: FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'tasks' | 'logs'>('overview')
  const [taskCount, setTaskCount] = useState(0)
  
  // Simulate task updates
  useEffect(() => {
    const timer = setInterval(() => {
      setTaskCount(c => c + 1)
    }, 3000)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <Box padding={1}>
      {/* Header */}
      <Box margin={[0, 0, 1, 0]}>
        <Text style={styles.title}>📊 Project Dashboard</Text>
      </Box>
      
      {/* Tabs */}
      <Box direction="horizontal" gap={2} margin={[0, 0, 1, 0]}>
        {(['overview', 'tasks', 'logs'] as const).map(tab => (
          <Text
            key={tab}
            style={{
              color: selectedTab === tab ? 'cyan' : 'gray',
              underline: selectedTab === tab
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        ))}
      </Box>
      
      {/* Content */}
      <Box style={{ border: 'single', padding: 1, minHeight: 10 }}>
        {selectedTab === 'overview' && (
          <Box>
            <Text>Project: my-app</Text>
            <Text>Version: 1.0.0</Text>
            <Text>Tasks completed: {taskCount}</Text>
          </Box>
        )}
        
        {selectedTab === 'tasks' && (
          <Box>
            <Text>Active tasks: 3</Text>
            <Text>Queued: 5</Text>
            <Text>Completed today: {taskCount}</Text>
          </Box>
        )}
        
        {selectedTab === 'logs' && (
          <Box>
            <Text style={styles.dim}>[10:23:45] Build started</Text>
            <Text style={styles.dim}>[10:23:46] Compiling...</Text>
            <Text style={styles.dim}>[10:23:50] Build complete</Text>
          </Box>
        )}
      </Box>
      
      <Box margin={[1, 0, 0, 0]}>
        <Text style={styles.dim}>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  )
}

export const dashboardCommand = defineCommand({
  name: 'dashboard',
  description: 'Show interactive project dashboard',
  
  handler: async () => {
    const app = createApp(<Dashboard />)
    app.render()
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      app.unmount()
      console.log('\nDashboard closed')
      process.exit(0)
    })
    
    // Keep the process alive
    await new Promise(() => {})
  }
})

// Export commands for use in a Bunli CLI
export default {
  build: buildCommand,
  dashboard: dashboardCommand
}

// Run directly if executed as a script
if (import.meta.main) {
  const command = process.argv[2] || 'dashboard'
  if (command === 'build') {
    buildCommand.handler({ flags: { watch: false }, positional: [], shell: {}, env: process.env, cwd: process.cwd() } as any)
  } else {
    dashboardCommand.handler({ flags: {}, positional: [], shell: {}, env: process.env, cwd: process.cwd() } as any)
  }
}