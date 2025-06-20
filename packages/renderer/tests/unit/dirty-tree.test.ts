/**
 * Tests for dirty tree spatial index
 */

import { test, expect, describe } from "bun:test"
import { DirtyTree } from '../../src/utils/dirty-tree.js'
import type { Bounds } from '../../src/types.js'

describe("DirtyTree", () => {
  test("initializes empty", () => {
    const tree = new DirtyTree()
    expect(tree.getAll()).toHaveLength(0)
    expect(tree.getAllBounds()).toHaveLength(0)
    expect(tree.getTotalArea()).toBe(0)
  })

  test("inserts and retrieves regions", () => {
    const tree = new DirtyTree()
    
    const bounds1: Bounds = { x: 10, y: 10, width: 20, height: 20 }
    const bounds2: Bounds = { x: 40, y: 40, width: 30, height: 30 }
    
    tree.insert(bounds1)
    tree.insert(bounds2)
    
    const all = tree.getAll()
    expect(all).toHaveLength(2)
    
    const allBounds = tree.getAllBounds()
    expect(allBounds).toHaveLength(2)
    expect(allBounds[0]).toEqual(bounds1)
    expect(allBounds[1]).toEqual(bounds2)
  })

  test("handles priority correctly", () => {
    const tree = new DirtyTree()
    
    tree.insert({ x: 0, y: 0, width: 10, height: 10 }, 1)
    tree.insert({ x: 20, y: 20, width: 10, height: 10 }, 2)
    
    const all = tree.getAll()
    expect(all[0].priority).toBe(1)
    expect(all[1].priority).toBe(2)
  })

  test("handles type filtering", () => {
    const tree = new DirtyTree()
    
    const contentBounds: Bounds = { x: 0, y: 0, width: 10, height: 10 }
    const borderBounds: Bounds = { x: 20, y: 20, width: 10, height: 10 }
    
    tree.insert(contentBounds, 0, 'content')
    tree.insert(borderBounds, 0, 'border')
    tree.insert({ x: 40, y: 40, width: 10, height: 10 }) // No type
    
    const contentRegions = tree.getByType('content')
    expect(contentRegions).toHaveLength(1)
    expect(contentRegions[0]).toEqual(contentBounds)
    
    const borderRegions = tree.getByType('border')
    expect(borderRegions).toHaveLength(1)
    expect(borderRegions[0]).toEqual(borderBounds)
  })

  test("calculates total area correctly", () => {
    const tree = new DirtyTree()
    
    // Insert two non-overlapping regions
    tree.insert({ x: 0, y: 0, width: 10, height: 10 })
    tree.insert({ x: 20, y: 20, width: 10, height: 10 })
    
    // Total area should be bounding box of all regions
    // From (0,0) to (30,30) = 30x30 = 900
    expect(tree.getTotalArea()).toBe(900)
  })

  test("calculates total area with overlapping regions", () => {
    const tree = new DirtyTree()
    
    // Insert overlapping regions
    tree.insert({ x: 0, y: 0, width: 20, height: 20 })
    tree.insert({ x: 10, y: 10, width: 20, height: 20 })
    
    // Total area is bounding box: (0,0) to (30,30) = 900
    expect(tree.getTotalArea()).toBe(900)
  })

  test("clear removes all regions", () => {
    const tree = new DirtyTree()
    
    tree.insert({ x: 0, y: 0, width: 10, height: 10 })
    tree.insert({ x: 20, y: 20, width: 10, height: 10 })
    
    expect(tree.getAll()).toHaveLength(2)
    
    tree.clear()
    
    expect(tree.getAll()).toHaveLength(0)
    expect(tree.getAllBounds()).toHaveLength(0)
    expect(tree.getTotalArea()).toBe(0)
  })

  test("handles empty getByType", () => {
    const tree = new DirtyTree()
    
    tree.insert({ x: 0, y: 0, width: 10, height: 10 }, 0, 'content')
    
    const borderRegions = tree.getByType('border')
    expect(borderRegions).toHaveLength(0)
  })

  test("converts bounds to rect format correctly", () => {
    const tree = new DirtyTree()
    const bounds: Bounds = { x: 5, y: 10, width: 15, height: 20 }
    
    tree.insert(bounds, 3, 'content')
    
    const all = tree.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].minX).toBe(5)
    expect(all[0].minY).toBe(10)
    expect(all[0].maxX).toBe(20) // x + width
    expect(all[0].maxY).toBe(30) // y + height
    expect(all[0].priority).toBe(3)
    expect(all[0].type).toBe('content')
  })

  test("converts rect to bounds format correctly", () => {
    const tree = new DirtyTree()
    tree.insert({ x: 5, y: 10, width: 15, height: 20 })
    
    const bounds = tree.getAllBounds()
    expect(bounds).toHaveLength(1)
    expect(bounds[0]).toEqual({ x: 5, y: 10, width: 15, height: 20 })
  })

  test("handles many regions efficiently", () => {
    const tree = new DirtyTree()
    
    // Insert 100 regions
    for (let i = 0; i < 100; i++) {
      tree.insert({
        x: i * 10,
        y: i * 10,
        width: 5,
        height: 5
      }, i % 3, i % 2 === 0 ? 'content' : 'border')
    }
    
    expect(tree.getAll()).toHaveLength(100)
    expect(tree.getByType('content')).toHaveLength(50)
    expect(tree.getByType('border')).toHaveLength(50)
    
    const area = tree.getTotalArea()
    expect(area).toBeGreaterThan(0)
    
    tree.clear()
    expect(tree.getAll()).toHaveLength(0)
  })
})