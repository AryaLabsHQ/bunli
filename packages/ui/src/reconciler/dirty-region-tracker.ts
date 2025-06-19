/**
 * Efficient dirty region tracking for terminal rendering
 * 
 * This system tracks which parts of the terminal have changed and need
 * to be redrawn, avoiding full screen refreshes.
 */

import type { Bounds } from '../types.js'

/**
 * A region that needs to be redrawn
 */
export interface DirtyRegion extends Bounds {
  // Priority of this region (for future priority-based rendering)
  priority?: number
}

/**
 * Tracks and optimizes dirty regions for efficient terminal updates
 */
export class DirtyRegionTracker {
  private regions: DirtyRegion[] = []
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
    
    // Try to merge with existing regions
    const merged = this.tryMergeRegion(clipped, priority)
    if (!merged) {
      this.regions.push({ ...clipped, priority })
    }
    
    // Optimize regions if we have too many
    if (this.regions.length > 10) {
      this.optimizeRegions()
    }
  }
  
  /**
   * Mark entire terminal for redraw
   */
  markFullRedraw(): void {
    this.fullRedraw = true
    this.regions = []
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
    
    return this.regions
  }
  
  /**
   * Clear all dirty regions
   */
  clear(): void {
    this.regions = []
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
    
    return this.regions.some(region => 
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    )
  }
  
  /**
   * Check if a bounds intersects any dirty region
   */
  intersectsAnyDirtyRegion(bounds: Bounds): boolean {
    if (this.fullRedraw) return true
    
    return this.regions.some(region => this.intersects(region, bounds))
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
  
  private tryMergeRegion(bounds: Bounds, priority: number): boolean {
    for (let i = 0; i < this.regions.length; i++) {
      const region = this.regions[i]
      
      // Check if regions overlap or are adjacent
      if (region && this.canMerge(region, bounds)) {
        // Merge into existing region
        this.regions[i] = this.merge(region, bounds, Math.max(region.priority || 0, priority))
        return true
      }
    }
    
    return false
  }
  
  private canMerge(a: Bounds, b: Bounds): boolean {
    // Check if regions overlap
    if (this.intersects(a, b)) return true
    
    // Check if regions are adjacent (within 1 cell)
    const expanded = {
      x: a.x - 1,
      y: a.y - 1,
      width: a.width + 2,
      height: a.height + 2,
    }
    
    return this.intersects(expanded, b)
  }
  
  private intersects(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    )
  }
  
  private merge(a: DirtyRegion, b: Bounds, priority: number): DirtyRegion {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    const right = Math.max(a.x + a.width, b.x + b.width)
    const bottom = Math.max(a.y + a.height, b.y + b.height)
    
    return {
      x,
      y,
      width: right - x,
      height: bottom - y,
      priority,
    }
  }
  
  private optimizeRegions(): void {
    // If we have too many small regions, try to merge them more aggressively
    const optimized: DirtyRegion[] = []
    const used = new Set<number>()
    
    for (let i = 0; i < this.regions.length; i++) {
      if (used.has(i)) continue
      
      let current = this.regions[i]
      used.add(i)
      
      // Try to merge with other regions
      let merged = false
      do {
        merged = false
        for (let j = i + 1; j < this.regions.length; j++) {
          if (used.has(j)) continue
          
          // More aggressive merging - if merging doesn't increase area too much
          const regionJ = this.regions[j]
          if (!regionJ || !current) continue
          const mergedRegion = this.merge(current, regionJ, 
            Math.max(current.priority || 0, regionJ.priority || 0))
          
          const currentArea = current.width * current.height
          const otherArea = regionJ.width * regionJ.height
          const mergedArea = mergedRegion.width * mergedRegion.height
          
          // If merged area is not more than 20% larger than combined areas
          if (mergedArea <= (currentArea + otherArea) * 1.2) {
            current = mergedRegion
            used.add(j)
            merged = true
          }
        }
      } while (merged)
      
      if (current) {
        optimized.push(current)
      }
    }
    
    this.regions = optimized
    
    // If still too many regions, just do a full redraw
    if (this.regions.length > 20) {
      this.markFullRedraw()
    }
  }
  
  /**
   * Get statistics about dirty regions (for debugging)
   */
  getStats(): {
    regionCount: number
    totalArea: number
    terminalArea: number
    coverage: number
    isFullRedraw: boolean
  } {
    const terminalArea = this.terminalWidth * this.terminalHeight
    
    if (this.fullRedraw) {
      return {
        regionCount: 1,
        totalArea: terminalArea,
        terminalArea,
        coverage: 1,
        isFullRedraw: true,
      }
    }
    
    const totalArea = this.regions.reduce(
      (sum, region) => sum + region.width * region.height,
      0
    )
    
    return {
      regionCount: this.regions.length,
      totalArea,
      terminalArea,
      coverage: totalArea / terminalArea,
      isFullRedraw: false,
    }
  }
}