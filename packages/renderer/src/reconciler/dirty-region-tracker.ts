/**
 * Efficient dirty region tracking for terminal rendering
 * 
 * This system tracks which parts of the terminal have changed and need
 * to be redrawn, avoiding full screen refreshes.
 */

import type { Bounds } from '../types.js'
import { DirtyTree } from '../utils/dirty-tree.js'

/**
 * A region that needs to be redrawn
 */
export interface DirtyRegion extends Bounds {
  priority?: number
  type?: 'content' | 'border'
}

/**
 * Tracks and optimizes dirty regions for efficient terminal updates
 */
export class DirtyRegionTracker {
  private tree = new DirtyTree()
  private fullRedraw = false
  
  constructor(
    private terminalWidth: number,
    private terminalHeight: number,
  ) {}
  
  /**
   * Mark a region as dirty (needs redraw)
   */
  markDirty(bounds: Bounds, priority = 0): void {
    if (this.fullRedraw) return
    
    // Clip to terminal bounds
    const clipped = this.clipToTerminal(bounds)
    if (!clipped) return
    
    // Check if this triggers a full redraw
    if (this.shouldFullRedraw(clipped)) {
      this.markFullRedraw()
      return
    }
    
    // Insert into spatial index
    this.tree.insert(clipped, priority, 'content')
  }
  
  /**
   * Mark entire terminal for redraw
   */
  markFullRedraw(): void {
    this.fullRedraw = true
    this.tree.clear()
  }
  
  /**
   * Check if a full redraw is needed
   */
  needsFullRedraw(): boolean {
    return this.fullRedraw
  }
  
  /**
   * Get all dirty regions (optimized)
   */
  getDirtyRegions(): DirtyRegion[] {
    if (this.fullRedraw) {
      return [{
        x: 0,
        y: 0,
        width: this.terminalWidth,
        height: this.terminalHeight,
        priority: 0,
      }]
    }
    
    // Get all dirty rectangles from the tree
    const dirtyRects = this.tree.getAll()
    
    // Convert DirtyRect format to DirtyRegion format
    return dirtyRects.map(rect => ({
      x: rect.minX,
      y: rect.minY,
      width: rect.maxX - rect.minX,
      height: rect.maxY - rect.minY,
      priority: rect.priority || 0,
      type: rect.type
    }))
  }
  
  /**
   * Clear all dirty regions
   */
  clear(): void {
    this.tree.clear()
    this.fullRedraw = false
  }
  
  /**
   * Update terminal dimensions
   */
  resize(width: number, height: number): void {
    this.terminalWidth = width
    this.terminalHeight = height
    // Terminal resize usually requires full redraw
    this.markFullRedraw()
  }
  
  /**
   * Check if a point is in any dirty region
   */
  isPointDirty(x: number, y: number): boolean {
    if (this.fullRedraw) return true
    
    return this.tree.getAllBounds().some(r =>
      x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height
    )
  }
  
  /**
   * Check if a bounds intersects any dirty region
   */
  intersectsAnyDirtyRegion(bounds: Bounds): boolean {
    if (this.fullRedraw) return true
    
    return this.tree.getAllBounds().some(r => this.intersects(r, bounds))
  }
  
  // Private methods
  
  private clipToTerminal(bounds: Bounds): Bounds | null {
    const x = Math.max(0, bounds.x)
    const y = Math.max(0, bounds.y)
    const right = Math.min(this.terminalWidth, bounds.x + bounds.width)
    const bottom = Math.min(this.terminalHeight, bounds.y + bounds.height)
    
    const width = right - x
    const height = bottom - y
    
    if (width <= 0 || height <= 0) {
      return null
    }
    
    return { x, y, width, height }
  }
  
  private shouldFullRedraw(bounds: Bounds): boolean {
    // If the region covers more than 50% of the screen, do a full redraw
    const regionArea = bounds.width * bounds.height
    const terminalArea = this.terminalWidth * this.terminalHeight
    
    return regionArea > terminalArea * 0.5
  }
  
  private intersects(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    )
  }
}