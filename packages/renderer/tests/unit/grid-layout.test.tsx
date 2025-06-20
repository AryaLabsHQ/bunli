/**
 * Tests for CSS Grid-like layout
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Grid, Box, Text } from '../../src/index.js'
import { createTestApp, getRenderedOutput } from '../utils/test-helpers.js'

describe("Grid Layout", () => {
  test("renders simple grid", () => {
    const { unmount } = createTestApp(40, 10)
    
    const app = (
      <Grid style={{ gridTemplateColumns: '10 10 10' }}>
        <Box style={{ border: 'single' }}><Text>1</Text></Box>
        <Box style={{ border: 'single' }}><Text>2</Text></Box>
        <Box style={{ border: 'single' }}><Text>3</Text></Box>
      </Grid>
    )
    
    unmount()
  })
  
  test("grid with fr units", () => {
    const { rerender, unmount } = createTestApp(50, 10)
    
    rerender(
      <Grid style={{ gridTemplateColumns: '1fr 2fr 1fr', height: 8 }}>
        <Box style={{ border: 'single', alignSelf: 'stretch' }}>
          <Text>Sidebar</Text>
        </Box>
        <Box style={{ border: 'single', alignSelf: 'stretch' }}>
          <Text>Main Content</Text>
        </Box>
        <Box style={{ border: 'single', alignSelf: 'stretch' }}>
          <Text>Sidebar</Text>
        </Box>
      </Grid>
    )
    
    // Just verify it renders without errors for now
    // TODO: Implement proper output testing
    
    unmount()
  })
  
  test("grid with gaps", () => {
    const { rerender, unmount } = createTestApp(40, 10)
    
    rerender(
      <Grid style={{ 
        gridTemplateColumns: '10 10',
        gridTemplateRows: '3 3',
        gridGap: 2
      }}>
        <Box style={{ border: 'single' }}><Text>A</Text></Box>
        <Box style={{ border: 'single' }}><Text>B</Text></Box>
        <Box style={{ border: 'single' }}><Text>C</Text></Box>
        <Box style={{ border: 'single' }}><Text>D</Text></Box>
      </Grid>
    )
    
    unmount()
  })
  
  test("grid with explicit positioning", () => {
    const { rerender, unmount } = createTestApp(40, 10)
    
    rerender(
      <Grid style={{ 
        gridTemplateColumns: '10 10 10',
        gridTemplateRows: '3 3 3'
      }}>
        <Box style={{ 
          border: 'single',
          gridColumn: 2,
          gridRow: 2
        }}>
          <Text>Center</Text>
        </Box>
        <Box style={{ 
          border: 'single',
          gridColumn: 1,
          gridRow: 1
        }}>
          <Text>Top-Left</Text>
        </Box>
      </Grid>
    )
    
    unmount()
  })
  
  test("grid with spanning cells", () => {
    const { rerender, unmount } = createTestApp(50, 10)
    
    rerender(
      <Grid style={{ 
        gridTemplateColumns: '10 10 10 10',
        gridTemplateRows: '3 3 3'
      }}>
        <Box style={{ 
          border: 'single',
          gridColumn: 1,
          gridRow: 1,
          gridColumnSpan: 2,
          gridRowSpan: 2
        }}>
          <Text>Big Cell</Text>
        </Box>
        <Box style={{ 
          border: 'single',
          gridColumn: 3,
          gridRow: 1
        }}>
          <Text>Small</Text>
        </Box>
      </Grid>
    )
    
    unmount()
  })
  
  test("grid with auto placement", () => {
    const { rerender, unmount } = createTestApp(40, 12)
    
    rerender(
      <Grid style={{ 
        gridTemplateColumns: '10 10 10',
        gridAutoFlow: 'row'
      }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} style={{ border: 'single' }}>
            <Text>{i + 1}</Text>
          </Box>
        ))}
      </Grid>
    )
    
    unmount()
  })
  
  test("grid with mixed auto and explicit placement", () => {
    const { rerender, unmount } = createTestApp(40, 10)
    
    rerender(
      <Grid style={{ 
        gridTemplateColumns: '10 10 10',
        gridTemplateRows: '3 3 3'
      }}>
        <Box style={{ border: 'single' }}><Text>Auto 1</Text></Box>
        <Box style={{ 
          border: 'single',
          gridColumn: 3,
          gridRow: 2
        }}>
          <Text>Fixed</Text>
        </Box>
        <Box style={{ border: 'single' }}><Text>Auto 2</Text></Box>
        <Box style={{ border: 'single' }}><Text>Auto 3</Text></Box>
      </Grid>
    )
    
    unmount()
  })
  
  test("grid with alignment", () => {
    const { rerender, unmount } = createTestApp(50, 12)
    
    rerender(
      <Grid style={{ 
        gridTemplateColumns: '15 15 15',
        gridTemplateRows: '5 5',
        height: 10
      }}>
        <Box style={{ 
          border: 'single',
          alignSelf: 'start',
          justifySelf: 'start'
        }}>
          <Text>Start</Text>
        </Box>
        <Box style={{ 
          border: 'single',
          alignSelf: 'center',
          justifySelf: 'center'
        }}>
          <Text>Center</Text>
        </Box>
        <Box style={{ 
          border: 'single',
          alignSelf: 'end',
          justifySelf: 'end'
        }}>
          <Text>End</Text>
        </Box>
        <Box style={{ 
          border: 'single',
          alignSelf: 'stretch',
          justifySelf: 'stretch'
        }}>
          <Text>Stretch</Text>
        </Box>
      </Grid>
    )
    
    unmount()
  })
  
  test("responsive grid that adjusts to container size", () => {
    const { rerender, unmount, terminal } = createTestApp(60, 10)
    
    const app = (
      <Grid style={{ 
        gridTemplateColumns: '1fr 1fr 1fr',
        gridGap: 1,
        height: 8
      }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} style={{ border: 'single' }}>
            <Text>Item {i + 1}</Text>
          </Box>
        ))}
      </Grid>
    )
    
    rerender(app)
    
    // Resize and re-render
    terminal.resize(40, 10)
    rerender(app)
    
    unmount()
  })
})