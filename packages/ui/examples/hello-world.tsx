#!/usr/bin/env bun
/**
 * Hello World Example
 * 
 * This example demonstrates the basic usage of Bunli UI:
 * - Creating a simple React component
 * - Using basic UI components (Box, Text)
 * - State management with hooks
 * - Creating and rendering an app
 */

import React, { useState, useEffect } from 'react'
import { createApp, Box, Text } from '@bunli/renderer'

function HelloWorld() {
  const [count, setCount] = useState(0)
  const [time, setTime] = useState(new Date().toLocaleTimeString())
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  // Auto-increment counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1)
    }, 2000)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <Box padding={2}>
      {/* Basic text display */}
      <Text style={{ color: 'cyan', bold: true }}>
        Hello from Bunli UI! 👋
      </Text>
      
      {/* Box with border for visual separation */}
      <Box margin={1} style={{ border: 'single', padding: 1 }}>
        <Text>Current time: {time}</Text>
        <Box margin={1}>
          <Text style={{ color: 'green' }}>
            Counter: {count} (auto-increments every 2s)
          </Text>
        </Box>
      </Box>
      
      {/* Instructions */}
      <Box margin={1}>
        <Text style={{ color: 'gray' }}>
          Press Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  )
}

// Create and render the app
const app = createApp(<HelloWorld />)
app.render()

// Log startup message
console.log('Hello World app is running...')