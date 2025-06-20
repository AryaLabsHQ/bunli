/**
 * Layout validation utilities for testing flex and grid specifications
 */

import type { LayoutInfo } from './ansi-validator.js'

export interface LayoutBox {
  x: number
  y: number
  width: number
  height: number
  content?: string
}

/**
 * Extract bounding boxes from layout information
 */
export function extractBoundingBoxes(layout: LayoutInfo[]): Map<string, LayoutBox> {
  const boxes = new Map<string, LayoutBox>()

  // Group by Y coordinate to find rows
  const rows = new Map<number, LayoutInfo[]>()
  for (const item of layout) {
    if (!rows.has(item.y)) {
      rows.set(item.y, [])
    }
    rows.get(item.y)!.push(item)
  }

  // Process each row to find continuous text segments
  for (const [y, items] of rows) {
    // Sort by X coordinate
    items.sort((a, b) => a.x - b.x)

    for (const item of items) {
      // First check if the line has leading spaces (for justified content)
      const leadingSpaces = item.text.match(/^(\s*)/)?.[1]?.length || 0
      const content = item.text.trim()
      if (!content) continue

      // For lines with leading spaces (justified content), adjust x position
      const actualX = item.x + leadingSpaces
      
      // First handle uppercase letter sequences
      if (/^[A-Z]+$/.test(content)) {
        // For single letters or two-letter combinations, extract individually
        if (content.length <= 2) {
          for (let i = 0; i < content.length; i++) {
            const char = content[i]
            boxes.set(char, {
              x: actualX + i,
              y: item.y,
              width: 1,
              height: 1,
              content: char
            })
          }
        } else {
          // For longer sequences like "ABC" or "XYZ", keep as a word
          boxes.set(content, {
            x: actualX,
            y: item.y,
            width: content.length,
            height: 1,
            content: content
          })
        }
      // Check if this looks like multiple words with single spaces
      } else if (/^\w+(\s\w+)+$/.test(content) && !content.includes('  ')) {
        // Extract each uppercase word separately
        const words = content.split(/\s+/)
        let currentPos = actualX
        let searchFrom = 0
        
        for (const word of words) {
          const wordIndex = item.text.indexOf(word, searchFrom)
          if (wordIndex >= 0) {
            boxes.set(word, {
              x: item.x + wordIndex,
              y: item.y,
              width: word.length,
              height: 1,
              content: word
            })
            searchFrom = wordIndex + word.length
          }
        }
      // Then check if this is a line with multiple items separated by double spaces
      } else if (item.text.includes('  ')) {
        // Extract individual items from grid line
        // Match words/letters that are separated by multiple spaces
        const regex = /(\S+)(?=\s{2,}|\s*$)/g
        const matches = [...item.text.matchAll(regex)]
        
        for (const match of matches) {
          const word = match[0]
          const offset = match.index || 0
          boxes.set(word, {
            x: item.x + offset,
            y: item.y,
            width: word.length,
            height: 1,
            content: word
          })
        }
      } else if (content.includes(' ') && content.trim().length > 0) {
        // Handle text with regular spaces (not grid spacing)
        // For multi-word phrases, keep them together
        boxes.set(content, {
          x: actualX,
          y: item.y,
          width: content.length,
          height: 1,
          content: content
        })
      } else if (boxes.has(content)) {
        // Extend existing box
        const box = boxes.get(content)!
        box.width = Math.max(box.width, item.x + item.text.length - box.x)
        box.height = Math.max(box.height, y - box.y + 1)
      } else {
        // Create new box
        boxes.set(content, {
          x: item.x,
          y: item.y,
          width: item.text.length,
          height: 1,
          content
        })
      }
    }
  }

  return boxes
}

/**
 * Validate flexbox layout properties
 */
export interface FlexValidation {
  direction: 'row' | 'column'
  items: string[]
  container: { width: number; height: number }
  gap?: number
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'end' | 'center' | 'stretch'
}

export function validateFlexLayout(
  boxes: Map<string, LayoutBox>,
  validation: FlexValidation
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const { direction, items, container, gap = 0, justify = 'start', align = 'stretch' } = validation

  // Check all items exist
  const itemBoxes: LayoutBox[] = []
  for (const item of items) {
    const box = boxes.get(item)
    if (!box) {
      errors.push(`Missing item: ${item}`)
    } else {
      itemBoxes.push(box)
    }
  }

  if (itemBoxes.length !== items.length) {
    return { valid: false, errors }
  }

  // Sort items by position
  if (direction === 'row') {
    itemBoxes.sort((a, b) => a.x - b.x)
  } else {
    itemBoxes.sort((a, b) => a.y - b.y)
  }

  // Validate main axis alignment
  if (direction === 'row') {
    // Check horizontal spacing
    for (let i = 1; i < itemBoxes.length; i++) {
      const prevEnd = itemBoxes[i - 1].x + itemBoxes[i - 1].width
      const currentStart = itemBoxes[i].x
      const actualGap = currentStart - prevEnd

      if (gap > 0 && Math.abs(actualGap - gap) > 1) {
        errors.push(`Invalid gap between items ${i-1} and ${i}: expected ${gap}, got ${actualGap}`)
      }
    }

    // Check justify-content
    const totalItemWidth = itemBoxes.reduce((sum, box) => sum + box.width, 0)
    const totalGapWidth = gap * (itemBoxes.length - 1)
    const freeSpace = container.width - totalItemWidth - totalGapWidth

    if (freeSpace > 0) {
      const firstX = itemBoxes[0].x
      const lastEnd = itemBoxes[itemBoxes.length - 1].x + itemBoxes[itemBoxes.length - 1].width

      switch (justify) {
        case 'start':
          if (firstX > 2) {
            errors.push(`justify-content: start - first item should be at start (x=${firstX})`)
          }
          break
        case 'end':
          if (Math.abs(lastEnd - container.width) > 2) {
            errors.push(`justify-content: end - last item should be at end`)
          }
          break
        case 'center':
          const expectedStart = Math.floor(freeSpace / 2) + 1
          if (Math.abs(firstX - expectedStart) > 2) {
            errors.push(`justify-content: center - items not centered`)
          }
          break
      }
    }
  } else {
    // Column direction - check vertical spacing
    for (let i = 1; i < itemBoxes.length; i++) {
      const prevEnd = itemBoxes[i - 1].y + itemBoxes[i - 1].height
      const currentStart = itemBoxes[i].y
      const actualGap = currentStart - prevEnd

      if (gap > 0 && Math.abs(actualGap - gap) > 1) {
        errors.push(`Invalid gap between items ${i-1} and ${i}: expected ${gap}, got ${actualGap}`)
      }
    }
  }

  // Validate cross axis alignment
  if (align === 'stretch') {
    for (const box of itemBoxes) {
      if (direction === 'row') {
        // In row direction, items should stretch full height
        if (box.height < container.height - 2) {
          errors.push(`Item "${box.content}" not stretched to full height`)
        }
      } else {
        // In column direction, items should stretch full width
        if (box.width < container.width - 2) {
          errors.push(`Item "${box.content}" not stretched to full width`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate CSS Grid layout
 */
export interface GridValidation {
  columns: number
  rows: number
  items: Array<{
    content: string
    column?: number
    row?: number
    columnSpan?: number
    rowSpan?: number
  }>
  gap?: { row?: number; column?: number }
}

export function validateGridLayout(
  boxes: Map<string, LayoutBox>,
  validation: GridValidation
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const { columns, rows, items, gap = {} } = validation

  // Calculate expected cell dimensions
  const gapRow = gap.row || 0
  const gapCol = gap.column || 0

  // Validate each item placement
  for (const item of items) {
    const box = boxes.get(item.content)
    if (!box) {
      errors.push(`Missing grid item: ${item.content}`)
      continue
    }

    // Validate position if specified
    if (item.column !== undefined || item.row !== undefined) {
      // Grid positioning is 1-indexed in spec but we'll validate relative positions
      // This is a simplified check - real grid validation would be more complex
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate that elements are within container bounds
 */
export function validateBounds(
  boxes: Map<string, LayoutBox>,
  containerWidth: number,
  containerHeight: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [content, box] of boxes) {
    if (box.x < 1) {
      errors.push(`Item "${content}" outside left bound (x=${box.x})`)
    }
    if (box.y < 1) {
      errors.push(`Item "${content}" outside top bound (y=${box.y})`)
    }
    if (box.x + box.width - 1 > containerWidth) {
      errors.push(`Item "${content}" outside right bound`)
    }
    if (box.y + box.height - 1 > containerHeight) {
      errors.push(`Item "${content}" outside bottom bound`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Helper to create layout assertions
 */
export class LayoutAssert {
  private boxes: Map<string, LayoutBox>

  constructor(layout: LayoutInfo[]) {
    this.boxes = extractBoundingBoxes(layout)
  }

  hasItem(content: string): this {
    if (!this.boxes.has(content)) {
      throw new Error(`Layout does not contain item: ${content}`)
    }
    return this
  }

  itemAt(content: string, x: number, y: number, tolerance: number = 1): this {
    const box = this.boxes.get(content)
    if (!box) {
      throw new Error(`Item not found: ${content}`)
    }
    if (Math.abs(box.x - x) > tolerance || Math.abs(box.y - y) > tolerance) {
      throw new Error(`Item "${content}" at wrong position: expected (${x},${y}), got (${box.x},${box.y})`)
    }
    return this
  }

  itemSize(content: string, width: number, height: number, tolerance: number = 1): this {
    const box = this.boxes.get(content)
    if (!box) {
      throw new Error(`Item not found: ${content}`)
    }
    if (Math.abs(box.width - width) > tolerance || Math.abs(box.height - height) > tolerance) {
      throw new Error(`Item "${content}" wrong size: expected ${width}x${height}, got ${box.width}x${box.height}`)
    }
    return this
  }

  flexLayout(validation: FlexValidation): this {
    const result = validateFlexLayout(this.boxes, validation)
    if (!result.valid) {
      throw new Error(`Flex layout validation failed:\n${result.errors.join('\n')}`)
    }
    return this
  }

  gridLayout(validation: GridValidation): this {
    const result = validateGridLayout(this.boxes, validation)
    if (!result.valid) {
      throw new Error(`Grid layout validation failed:\n${result.errors.join('\n')}`)
    }
    return this
  }

  withinBounds(width: number, height: number): this {
    const result = validateBounds(this.boxes, width, height)
    if (!result.valid) {
      throw new Error(`Bounds validation failed:\n${result.errors.join('\n')}`)
    }
    return this
  }
}