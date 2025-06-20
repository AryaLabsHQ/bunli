/**
 * Lightweight RBush spatial index (MIT license, adapted for Bunli)
 * Source derived from https://github.com/mourner/rbush (v3) with pruning to
 * keep only the functionality we need for dirty region tracking.
 */

// Rectangle type expected by RBush
export interface RTreeRect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

// Internal node structure
interface RTreeNode<T extends RTreeRect = RTreeRect> extends RTreeRect {
  leaf: boolean
  height: number
  children: Array<T | RTreeNode<T>>
}

// Type guard for node vs data
function isNode<T extends RTreeRect>(item: T | RTreeNode<T>): item is RTreeNode<T> {
  return 'leaf' in item && typeof (item as any).leaf === 'boolean'
}

// Generic RBush class (only insert, clear, all)
export default class RBush<T extends RTreeRect = RTreeRect> {
  private _maxEntries: number
  private _minEntries: number
  private data: RTreeNode<T>

  constructor(maxEntries = 9) {
    this._maxEntries = Math.max(4, maxEntries)
    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4))
    this.data = createNode<T>([])
  }

  /* Public API */
  clear(): this {
    this.data = createNode<T>([])
    return this
  }

  all(): T[] {
    return this._all(this.data, [])
  }

  insert(item: T): this {
    if (!item) return this
    this._insert(item, this.data.height - 1)
    return this
  }

  /* Internal helpers */
  private _all(node: RTreeNode<T>, result: T[]): T[] {
    const nodesToSearch: RTreeNode<T>[] = []
    let currentNode: RTreeNode<T> | undefined = node
    
    while (currentNode) {
      if (currentNode.leaf) {
        // Leaf nodes contain data items
        for (const child of currentNode.children) {
          if (!isNode(child)) {
            result.push(child)
          }
        }
      } else {
        // Branch nodes contain other nodes
        for (const child of currentNode.children) {
          if (isNode(child)) {
            nodesToSearch.push(child)
          }
        }
      }
      currentNode = nodesToSearch.pop()
    }
    
    return result
  }

  private _insert(item: T, level: number): void {
    const insertPath: RTreeNode<T>[] = []
    
    // Choose subtree for insertion
    const node = this._chooseSubtree(item, this.data, level, insertPath)
    
    // Insert item
    node.children.push(item)
    extend(node, item)
    
    // Split nodes if necessary
    while (level >= 0) {
      const pathNode = insertPath[level]
      if (pathNode && pathNode.children.length > this._maxEntries) {
        this._split(insertPath, level)
        level--
      } else {
        break
      }
    }
    
    // Adjust bounding boxes along the path
    this._adjustParentBBoxes(item, insertPath, level)
  }

  private _chooseSubtree(
    bbox: RTreeRect,
    node: RTreeNode<T>,
    level: number,
    path: RTreeNode<T>[]
  ): RTreeNode<T> {
    while (true) {
      path.push(node)
      
      if (node.leaf || path.length - 1 === level) break
      
      let minArea = Infinity
      let minEnlargement = Infinity
      let targetNode: RTreeNode<T> | undefined
      
      for (const child of node.children) {
        if (!isNode(child)) continue
        
        const area = bboxArea(child)
        const enlargement = enlargedArea(bbox, child) - area
        
        if (enlargement < minEnlargement) {
          minEnlargement = enlargement
          minArea = area
          targetNode = child
        } else if (enlargement === minEnlargement && area < minArea) {
          minArea = area
          targetNode = child
        }
      }
      
      // Move to the best child node
      if (targetNode) {
        node = targetNode
      } else {
        // Fallback to first child if no better option
        const firstChild = node.children[0]
        if (firstChild && isNode(firstChild)) {
          node = firstChild
        } else {
          break // No valid child nodes
        }
      }
    }
    
    return node
  }

  private _split(insertPath: RTreeNode<T>[], level: number): void {
    const node = insertPath[level]
    if (!node) return
    
    const M = node.children.length
    const m = this._minEntries
    
    this._chooseSplitAxis(node, m, M)
    const splitIndex = this._chooseSplitIndex(node, m, M)
    
    const newNode = createNode<T>(node.children.splice(splitIndex))
    newNode.height = node.height
    newNode.leaf = node.leaf
    
    calcBBox(node)
    calcBBox(newNode)
    
    const parentNode = level > 0 ? insertPath[level - 1] : undefined
    if (parentNode) {
      parentNode.children.push(newNode)
    } else {
      this._splitRoot(node, newNode)
    }
  }

  private _splitRoot(node: RTreeNode<T>, newNode: RTreeNode<T>): void {
    this.data = createNode<T>([node, newNode])
    this.data.height = node.height + 1
    this.data.leaf = false
    calcBBox(this.data)
  }

  private _chooseSplitAxis(node: RTreeNode<T>, m: number, M: number): void {
    const xMargin = this._allDistMargin(node, m, M, compareNodeMinX)
    const yMargin = this._allDistMargin(node, m, M, compareNodeMinY)
    
    if (xMargin < yMargin) {
      node.children.sort(compareNodeMinX)
    }
  }

  private _chooseSplitIndex(node: RTreeNode<T>, m: number, M: number): number {
    let index = m
    let minOverlap = Infinity
    let minArea = Infinity
    
    for (let i = m; i <= M - m; i++) {
      const bbox1 = distBBox(node, 0, i)
      const bbox2 = distBBox(node, i, M)
      
      const overlap = intersectionArea(bbox1, bbox2)
      const area = bboxArea(bbox1) + bboxArea(bbox2)
      
      if (overlap < minOverlap) {
        minOverlap = overlap
        minArea = area
        index = i
      } else if (overlap === minOverlap && area < minArea) {
        minArea = area
        index = i
      }
    }
    
    return index
  }

  private _allDistMargin(
    node: RTreeNode<T>,
    m: number,
    M: number,
    compare: (a: RTreeRect, b: RTreeRect) => number
  ): number {
    node.children.sort(compare)
    
    const leftBBox = distBBox(node, 0, m)
    const rightBBox = distBBox(node, M - m, M)
    let margin = bboxMargin(leftBBox) + bboxMargin(rightBBox)
    
    for (let i = m; i < M - m; i++) {
      const child = node.children[i]
      if (child) {
        extend(leftBBox, isNode(child) ? child : child)
        margin += bboxMargin(leftBBox)
      }
    }
    
    for (let i = M - m - 1; i >= m; i--) {
      const child = node.children[i]
      if (child) {
        extend(rightBBox, isNode(child) ? child : child)
        margin += bboxMargin(rightBBox)
      }
    }
    
    return margin
  }

  private _adjustParentBBoxes(bbox: RTreeRect, path: RTreeNode<T>[], level: number): void {
    for (let i = level; i >= 0; i--) {
      const node = path[i]
      if (node) {
        extend(node, bbox)
      }
    }
  }
}

/* Helper functions */

function createNode<T extends RTreeRect>(children: Array<T | RTreeNode<T>>): RTreeNode<T> {
  return {
    children,
    height: 1,
    leaf: true,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }
}

function calcBBox<T extends RTreeRect>(node: RTreeNode<T>): void {
  node.minX = Infinity
  node.minY = Infinity
  node.maxX = -Infinity
  node.maxY = -Infinity
  
  for (const child of node.children) {
    extend(node, isNode(child) ? child : child)
  }
}

function distBBox<T extends RTreeRect>(
  node: RTreeNode<T>,
  k: number,
  p: number
): RTreeRect {
  const dest: RTreeRect = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }
  
  for (let i = k; i < p && i < node.children.length; i++) {
    const child = node.children[i]
    if (child) {
      extend(dest, isNode(child) ? child : child)
    }
  }
  
  return dest
}

function extend(a: RTreeRect, b: RTreeRect): void {
  a.minX = Math.min(a.minX, b.minX)
  a.minY = Math.min(a.minY, b.minY)
  a.maxX = Math.max(a.maxX, b.maxX)
  a.maxY = Math.max(a.maxY, b.maxY)
}

function compareNodeMinX(a: RTreeRect, b: RTreeRect): number {
  return a.minX - b.minX
}

function compareNodeMinY(a: RTreeRect, b: RTreeRect): number {
  return a.minY - b.minY
}

function bboxArea(a: RTreeRect): number {
  return (a.maxX - a.minX) * (a.maxY - a.minY)
}

function bboxMargin(a: RTreeRect): number {
  return (a.maxX - a.minX) + (a.maxY - a.minY)
}

function enlargedArea(a: RTreeRect, b: RTreeRect): number {
  const minX = Math.min(a.minX, b.minX)
  const minY = Math.min(a.minY, b.minY)
  const maxX = Math.max(a.maxX, b.maxX)
  const maxY = Math.max(a.maxY, b.maxY)
  return (maxX - minX) * (maxY - minY)
}

function intersectionArea(a: RTreeRect, b: RTreeRect): number {
  const minX = Math.max(a.minX, b.minX)
  const minY = Math.max(a.minY, b.minY)
  const maxX = Math.min(a.maxX, b.maxX)
  const maxY = Math.min(a.maxY, b.maxY)
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY)
} 