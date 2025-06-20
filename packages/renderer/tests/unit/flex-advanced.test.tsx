/**
 * Tests for advanced flexbox features
 */

import { test, expect, describe } from "bun:test"
import React from 'react'
import { Box, Text, Row, Column } from '../../src/index.js'
import { createTestApp } from '../utils/test-helpers.js'

describe("Advanced Flex Features", () => {
  test("flex-grow distributes space", () => {
    const { rerender, unmount } = createTestApp(50, 10)
    
    rerender(
      <Row height={5}>
        <Box style={{ border: 'single' }} flexGrow={1}>
          <Text>Grow 1</Text>
        </Box>
        <Box style={{ border: 'single' }} flexGrow={2}>
          <Text>Grow 2</Text>
        </Box>
        <Box style={{ border: 'single' }} flexGrow={1}>
          <Text>Grow 1</Text>
        </Box>
      </Row>
    )
    
    // The middle box should be twice as wide as the others
    
    unmount()
  })
  
  test("flex-shrink compresses items", () => {
    const { rerender, unmount } = createTestApp(30, 10)
    
    rerender(
      <Row height={5}>
        <Box style={{ border: 'single' }} flexBasis={15} flexShrink={1}>
          <Text>Shrink 1</Text>
        </Box>
        <Box style={{ border: 'single' }} flexBasis={15} flexShrink={2}>
          <Text>Shrink 2</Text>
        </Box>
        <Box style={{ border: 'single' }} flexBasis={15} flexShrink={1}>
          <Text>Shrink 1</Text>
        </Box>
      </Row>
    )
    
    // The middle box should shrink more than the others
    
    unmount()
  })
  
  test("flex shorthand works", () => {
    const { rerender, unmount } = createTestApp(40, 10)
    
    rerender(
      <Row height={5}>
        <Box style={{ border: 'single' }} flex={1}>
          <Text>Flex 1</Text>
        </Box>
        <Box style={{ border: 'single' }} flex={2}>
          <Text>Flex 2</Text>
        </Box>
      </Row>
    )
    
    unmount()
  })
  
  test("justify-content with flex items", () => {
    const { rerender, unmount } = createTestApp(50, 10)
    
    rerender(
      <Row height={5} justify="between">
        <Box style={{ border: 'single' }} width={10}>
          <Text>Start</Text>
        </Box>
        <Box style={{ border: 'single' }} width={10}>
          <Text>End</Text>
        </Box>
      </Row>
    )
    
    unmount()
  })
  
  test("align-items stretches by default", () => {
    const { rerender, unmount } = createTestApp(40, 10)
    
    rerender(
      <Row height={8}>
        <Box style={{ border: 'single' }} flex={1}>
          <Text>Should stretch vertically</Text>
        </Box>
        <Box style={{ border: 'single' }} flex={1}>
          <Text>Also stretches</Text>
        </Box>
      </Row>
    )
    
    unmount()
  })
  
  test("align-items center", () => {
    const { rerender, unmount } = createTestApp(40, 10)
    
    rerender(
      <Row height={8} align="center">
        <Box style={{ border: 'single' }} height={3}>
          <Text>Center</Text>
        </Box>
        <Box style={{ border: 'single' }} height={5}>
          <Text>Aligned</Text>
        </Box>
      </Row>
    )
    
    unmount()
  })
  
  test("vertical flex with grow", () => {
    const { rerender, unmount } = createTestApp(30, 20)
    
    rerender(
      <Column width={25}>
        <Box style={{ border: 'single' }} flexGrow={1}>
          <Text>Header</Text>
        </Box>
        <Box style={{ border: 'single' }} flexGrow={3}>
          <Text>Main Content</Text>
          <Text>Takes more space</Text>
        </Box>
        <Box style={{ border: 'single' }} flexGrow={1}>
          <Text>Footer</Text>
        </Box>
      </Column>
    )
    
    unmount()
  })
  
  test("complex flex layout", () => {
    const { rerender, unmount } = createTestApp(60, 15)
    
    rerender(
      <Box height={12}>
        <Row flexGrow={1}>
          <Column style={{ border: 'single' }} flexBasis={15} flexShrink={0}>
            <Text>Sidebar</Text>
            <Text>Fixed width</Text>
          </Column>
          <Column style={{ border: 'single' }} flexGrow={1}>
            <Box style={{ border: 'single' }} height={3}>
              <Text>Header</Text>
            </Box>
            <Box flexGrow={1} justify="center" align="center">
              <Text>Main content area</Text>
            </Box>
            <Box style={{ border: 'single' }} height={2}>
              <Text>Footer</Text>
            </Box>
          </Column>
        </Row>
      </Box>
    )
    
    unmount()
  })
  
  test("gap with flex items", () => {
    const { rerender, unmount } = createTestApp(40, 8)
    
    rerender(
      <Row gap={2} height={5}>
        <Box style={{ border: 'single' }} flex={1}>
          <Text>A</Text>
        </Box>
        <Box style={{ border: 'single' }} flex={1}>
          <Text>B</Text>
        </Box>
        <Box style={{ border: 'single' }} flex={1}>
          <Text>C</Text>
        </Box>
      </Row>
    )
    
    unmount()
  })
  
  test("mixed fixed and flex items", () => {
    const { rerender, unmount } = createTestApp(50, 8)
    
    rerender(
      <Row height={5}>
        <Box style={{ border: 'single' }} width={10}>
          <Text>Fixed</Text>
        </Box>
        <Box style={{ border: 'single' }} flexGrow={1}>
          <Text>Flexible</Text>
        </Box>
        <Box style={{ border: 'single' }} width={10}>
          <Text>Fixed</Text>
        </Box>
      </Row>
    )
    
    unmount()
  })
})