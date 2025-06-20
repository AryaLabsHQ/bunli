/**
 * Adapter for RBush that works with our Bounds interface
 */

import RBush, { type RTreeRect } from './rbush.js'
import type { Bounds } from '../types.js'

// Extended bounds that includes priority for dirty regions
export interface DirtyRect extends RTreeRect {
  priority?: number
  type?: 'content' | 'border'
}

/**
 * Converts Bounds to RTreeRect format
 */
function boundsToRect(bounds: Bounds, priority?: number, type?: 'content' | 'border'): DirtyRect {
  return {
    minX: bounds.x,
    minY: bounds.y,
    maxX: bounds.x + bounds.width,
    maxY: bounds.y + bounds.height,
    priority,
    type,
  }
}

/**
 * Converts RTreeRect back to Bounds format
 */
function rectToBounds(rect: RTreeRect): Bounds {
  return {
    x: rect.minX,
    y: rect.minY,
    width: rect.maxX - rect.minX,
    height: rect.maxY - rect.minY,
  }
}

/**
 * Spatial index for dirty regions using R-tree
 */
export class DirtyTree {
  private tree = new RBush<DirtyRect>(9) // 9 max entries per node (default)
  
  /**
   * Insert a dirty region
   */
  insert(bounds: Bounds, priority = 0, type?: 'content' | 'border'): void {
    this.tree.insert(boundsToRect(bounds, priority, type))
  }
  
  /**
   * Get all dirty regions
   */
  getAll(): DirtyRect[] {
    return this.tree.all()
  }
  
  /**
   * Get all dirty regions as Bounds
   */
  getAllBounds(): Bounds[] {
    return this.tree.all().map(rectToBounds)
  }
  
  /**
   * Clear all regions
   */
  clear(): void {
    this.tree.clear()
  }
  
  /**
   * Get total area covered by dirty regions
   */
  getTotalArea(): number {
    const regions = this.tree.all()
    if (regions.length === 0) return 0
    
    // Calculate bounding box of all regions
    let minX = Infinity
    let minY = Infinity  
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const region of regions) {
      minX = Math.min(minX, region.minX)
      minY = Math.min(minY, region.minY)
      maxX = Math.max(maxX, region.maxX)
      maxY = Math.max(maxY, region.maxY)
    }
    
    return (maxX - minX) * (maxY - minY)
  }
  
  /**
   * Get regions by type
   */
  getByType(type: 'content' | 'border'): Bounds[] {
    return this.tree.all()
      .filter(rect => rect.type === type)
      .map(rectToBounds)
  }
} 