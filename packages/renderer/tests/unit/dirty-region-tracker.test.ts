/**
 * Dirty region tracking tests
 */

import { test, expect, describe } from "bun:test"
import { DirtyRegionTracker } from '../../src/reconciler/dirty-region-tracker.js'

describe("DirtyRegionTracker", () => {
  test("tracks single dirty region", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    tracker.markDirty({ x: 10, y: 5, width: 20, height: 10 })
    
    const regions = tracker.getDirtyRegions()
    expect(regions).toHaveLength(1)
    // Note: R-tree doesn't guarantee order or exact structure, just bounds
    expect(regions[0]).toMatchObject({ 
      x: 10, 
      y: 5, 
      width: 20, 
      height: 10
    })
  })
  
  test("tracks overlapping regions without merging", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // Two overlapping regions
    tracker.markDirty({ x: 0, y: 0, width: 10, height: 10 })
    tracker.markDirty({ x: 5, y: 5, width: 10, height: 10 })
    
    const regions = tracker.getDirtyRegions()
    // R-tree keeps both regions, no automatic merging
    expect(regions).toHaveLength(2)
    
    // Check both regions are tracked
    const totalBounds = regions.reduce((acc, r) => ({
      minX: Math.min(acc.minX, r.x),
      minY: Math.min(acc.minY, r.y),
      maxX: Math.max(acc.maxX, r.x + r.width),
      maxY: Math.max(acc.maxY, r.y + r.height)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
    
    expect(totalBounds).toEqual({ 
      minX: 0, 
      minY: 0, 
      maxX: 15, 
      maxY: 15
    })
  })
  
  test("tracks adjacent regions without merging", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // Two adjacent regions (touching)
    tracker.markDirty({ x: 0, y: 0, width: 10, height: 10 })
    tracker.markDirty({ x: 10, y: 0, width: 10, height: 10 })
    
    const regions = tracker.getDirtyRegions()
    // R-tree keeps both regions separate
    expect(regions).toHaveLength(2)
  })
  
  test("keeps separate non-overlapping regions", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // Two separate regions
    tracker.markDirty({ x: 0, y: 0, width: 10, height: 10 })
    tracker.markDirty({ x: 50, y: 15, width: 10, height: 5 })
    
    const regions = tracker.getDirtyRegions()
    expect(regions).toHaveLength(2)
  })
  
  test("triggers full redraw when coverage exceeds threshold", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // Mark 60% of screen as dirty (threshold is usually 50%)
    tracker.markDirty({ x: 0, y: 0, width: 50, height: 20 })
    
    expect(tracker.needsFullRedraw()).toBe(true)
    
    const regions = tracker.getDirtyRegions()
    expect(regions).toHaveLength(1)
    
    // Should return full screen region
    expect(regions[0]).toEqual({ 
      x: 0, 
      y: 0, 
      width: 80, 
      height: 24,
      priority: 0 
    })
  })
  
  test("clips regions to terminal bounds", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // Region extends beyond terminal
    tracker.markDirty({ x: 70, y: 20, width: 20, height: 10 })
    
    const regions = tracker.getDirtyRegions()
    expect(regions).toHaveLength(1)
    
    // Should be clipped to terminal bounds
    expect(regions[0]).toMatchObject({ 
      x: 70, 
      y: 20, 
      width: 10, // clipped from 20 to 10
      height: 4   // clipped from 10 to 4
    })
  })
  
  test("ignores regions outside terminal bounds", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // Completely outside
    tracker.markDirty({ x: 100, y: 30, width: 10, height: 10 })
    
    const regions = tracker.getDirtyRegions()
    expect(regions).toHaveLength(0)
  })
  
  test("handles markFullRedraw", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // Add some regions
    tracker.markDirty({ x: 10, y: 10, width: 5, height: 5 })
    tracker.markDirty({ x: 20, y: 20, width: 5, height: 5 })
    
    // Force full redraw
    tracker.markFullRedraw()
    
    expect(tracker.needsFullRedraw()).toBe(true)
    
    const regions = tracker.getDirtyRegions()
    expect(regions).toHaveLength(1)
    expect(regions[0]).toEqual({ 
      x: 0, 
      y: 0, 
      width: 80, 
      height: 24,
      priority: 0 
    })
  })
  
  test("clears regions after clear()", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    tracker.markDirty({ x: 10, y: 10, width: 10, height: 10 })
    
    const regions1 = tracker.getDirtyRegions()
    expect(regions1).toHaveLength(1)
    
    // Clear the regions
    tracker.clear()
    
    // Should be empty after clearing
    const regions2 = tracker.getDirtyRegions()
    expect(regions2).toHaveLength(0)
  })
  
  test("tracks priority with regions", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // High priority region
    tracker.markDirty({ x: 0, y: 0, width: 10, height: 10 }, 10)
    
    // Low priority overlapping region
    tracker.markDirty({ x: 5, y: 5, width: 10, height: 10 }, 1)
    
    const regions = tracker.getDirtyRegions()
    // Both regions are kept with R-tree
    expect(regions).toHaveLength(2)
    
    // Check priorities are preserved
    const highPriorityRegion = regions.find(r => r.x === 0 && r.y === 0)
    const lowPriorityRegion = regions.find(r => r.x === 5 && r.y === 5)
    
    expect(highPriorityRegion?.priority).toBe(10)
    expect(lowPriorityRegion?.priority).toBe(1)
  })
  
  test("handles many small regions efficiently", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    // Add many small adjacent regions (like individual character updates)
    for (let x = 0; x < 20; x++) {
      tracker.markDirty({ x, y: 0, width: 1, height: 1 })
    }
    
    const regions = tracker.getDirtyRegions()
    
    // R-tree keeps individual regions but renderer will handle them efficiently
    expect(regions).toHaveLength(20)
    
    // Verify all positions are tracked
    const xPositions = regions.map(r => r.x).sort((a, b) => a - b)
    expect(xPositions).toEqual(Array.from({ length: 20 }, (_, i) => i))
  })
  
  test("handles resize", () => {
    const tracker = new DirtyRegionTracker(80, 24)
    
    tracker.markDirty({ x: 70, y: 20, width: 10, height: 4 })
    
    // Resize terminal - this triggers a full redraw
    tracker.resize(100, 30)
    
    // After resize, we should get a full redraw region
    const regions = tracker.getDirtyRegions()
    expect(regions).toHaveLength(1)
    
    // Should be full screen after resize
    expect(regions[0]).toEqual({ 
      x: 0, 
      y: 0, 
      width: 100, 
      height: 30,
      priority: 0 
    })
    
    // Clear and test that new regions work with new size
    tracker.clear()
    tracker.markDirty({ x: 90, y: 25, width: 10, height: 5 })
    
    const newRegions = tracker.getDirtyRegions()
    expect(newRegions).toHaveLength(1)
    
    // Should be clipped to new terminal size
    expect(newRegions[0]).toMatchObject({ 
      x: 90, 
      y: 25, 
      width: 10, 
      height: 5
    })
  })
})