/**
 * List component with keyboard navigation
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, Row, Column } from '../reconciler/components.js'
import type { BoxProps } from '../reconciler/terminal-element.js'
import { useFocus } from '../focus/use-focus.js'
import { keyboardManager } from '../focus/keyboard-manager.js'

export interface ListItem {
  id: string
  label: string
  value?: any
  disabled?: boolean
}

export interface ListProps extends Omit<BoxProps, 'children'> {
  /**
   * List items
   */
  items: ListItem[]
  /**
   * Selected item ID (controlled)
   */
  selectedId?: string
  /**
   * Called when selection changes
   */
  onSelect?: (item: ListItem) => void
  /**
   * Custom item renderer
   */
  renderItem?: (item: ListItem, isSelected: boolean, isFocused: boolean) => React.ReactNode
  /**
   * Maximum visible items (scrollable)
   */
  maxHeight?: number
  /**
   * Is the list focused? (controlled)
   */
  focused?: boolean
  /**
   * Auto-focus on mount
   */
  autoFocus?: boolean
  /**
   * Tab index
   */
  tabIndex?: number
  /**
   * Focus handler
   */
  onFocus?: () => void
  /**
   * Blur handler
   */
  onBlur?: () => void
  /**
   * Show selection indicator
   */
  showIndicator?: boolean
  /**
   * Selection indicator
   */
  indicator?: string
  /**
   * Empty state message
   */
  emptyMessage?: string
}

export function List({
  items,
  selectedId: controlledSelectedId,
  onSelect,
  renderItem,
  maxHeight,
  focused: controlledFocused,
  autoFocus = false,
  tabIndex = 0,
  onFocus,
  onBlur,
  showIndicator = true,
  indicator = '▸',
  emptyMessage = 'No items',
  style,
  ...props
}: ListProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>(
    controlledSelectedId || items[0]?.id
  )
  const [focusedIndex, setFocusedIndex] = useState(0)
  
  const selectedId = controlledSelectedId ?? internalSelectedId
  
  const { isFocused, focusProps } = useFocus({
    tabIndex,
    autoFocus,
    onFocus,
    onBlur,
  })
  
  const focused = controlledFocused ?? isFocused
  
  // Handle empty state
  if (items.length === 0) {
    return (
      <Box style={{ ...style, dim: true }} {...props}>
        <Text>{emptyMessage}</Text>
      </Box>
    )
  }
  
  // Update focused index when selected ID changes
  useEffect(() => {
    const index = items.findIndex(item => item.id === selectedId)
    if (index !== -1) {
      setFocusedIndex(index)
    }
  }, [selectedId, items])
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!focused) return
    
    const handleKey = (event: any) => {
      const { name } = event
      
      switch (name) {
        case 'up':
        case 'k':
          {
            const newIndex = Math.max(0, focusedIndex - 1)
            // Skip disabled items
            let targetIndex = newIndex
            while (targetIndex > 0 && items[targetIndex]?.disabled) {
              targetIndex--
            }
            if (!items[targetIndex]?.disabled) {
              setFocusedIndex(targetIndex)
              const item = items[targetIndex]
              if (item) {
                setInternalSelectedId(item.id)
              }
            }
          }
          return true
          
        case 'down':
        case 'j':
          {
            const newIndex = Math.min(items.length - 1, focusedIndex + 1)
            // Skip disabled items
            let targetIndex = newIndex
            while (targetIndex < items.length - 1 && items[targetIndex]?.disabled) {
              targetIndex++
            }
            if (!items[targetIndex]?.disabled) {
              setFocusedIndex(targetIndex)
              const item = items[targetIndex]
              if (item) {
                setInternalSelectedId(item.id)
              }
            }
          }
          return true
          
        case 'home':
        case 'g':
          {
            // Find first non-disabled item
            let targetIndex = 0
            while (targetIndex < items.length - 1 && items[targetIndex]?.disabled) {
              targetIndex++
            }
            if (!items[targetIndex]?.disabled) {
              setFocusedIndex(targetIndex)
              const item = items[targetIndex]
              if (item) {
                setInternalSelectedId(item.id)
              }
            }
          }
          return true
          
        case 'end':
        case 'G':
          {
            // Find last non-disabled item
            let targetIndex = items.length - 1
            while (targetIndex > 0 && items[targetIndex]?.disabled) {
              targetIndex--
            }
            if (!items[targetIndex]?.disabled) {
              setFocusedIndex(targetIndex)
              const item = items[targetIndex]
              if (item) {
                setInternalSelectedId(item.id)
              }
            }
          }
          return true
          
        case 'enter':
        case 'space':
          {
            const item = items[focusedIndex]
            if (item && !item.disabled) {
              onSelect?.(item)
            }
          }
          return true
      }
      
      return false
    }
    
    keyboardManager.on('key', handleKey)
    return () => {
      keyboardManager.off('key', handleKey)
    }
  }, [focused, focusedIndex, items, onSelect])
  
  // Calculate visible range for scrolling
  let visibleItems = items
  let scrollOffset = 0
  
  if (maxHeight && items.length > maxHeight) {
    // Keep focused item in view
    if (focusedIndex < scrollOffset) {
      scrollOffset = focusedIndex
    } else if (focusedIndex >= scrollOffset + maxHeight) {
      scrollOffset = focusedIndex - maxHeight + 1
    }
    
    visibleItems = items.slice(scrollOffset, scrollOffset + maxHeight)
  }
  
  return (
    <Box
      style={{
        border: focused ? 'single' : undefined,
        borderColor: focused ? 'blue' : undefined,
        padding: focused ? [0, 1] : 0,
        ...style
      }}
      {...props}
    >
      <Column gap={0}>
        {visibleItems.map((item, visibleIndex) => {
          const actualIndex = scrollOffset + visibleIndex
          const isSelected = item.id === selectedId
          const isFocusedItem = actualIndex === focusedIndex && focused
          
          if (renderItem) {
            return (
              <Box key={item.id}>
                {renderItem(item, isSelected, isFocusedItem)}
              </Box>
            )
          }
          
          return (
            <Box
              key={item.id}
              style={{
                backgroundColor: isFocusedItem ? 'blue' : undefined,
                padding: [0, 1]
              }}
            >
              <Text
                style={{
                  color: item.disabled ? 'gray' : (isSelected && !isFocusedItem ? 'green' : undefined),
                  bold: isSelected,
                  inverse: isFocusedItem
                }}
              >
                {showIndicator && isSelected ? `${indicator} ` : '  '}
                {item.label}
              </Text>
            </Box>
          )
        })}
        
        {maxHeight && items.length > maxHeight && (
          <Box style={{ marginTop: 1 }}>
            <Text style={{ dim: true }}>
              {focusedIndex + 1}/{items.length}
            </Text>
          </Box>
        )}
      </Column>
    </Box>
  )
}

// Checkbox list variant
export interface CheckboxListProps extends Omit<ListProps, 'selectedId' | 'onSelect'> {
  /**
   * Selected item IDs
   */
  selectedIds?: string[]
  /**
   * Called when selection changes
   */
  onToggle?: (id: string, checked: boolean) => void
}

export function CheckboxList({
  items,
  selectedIds = [],
  onToggle,
  renderItem,
  ...props
}: CheckboxListProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds)
  const effectiveSelectedIds = selectedIds.length > 0 ? selectedIds : internalSelectedIds
  
  const handleSelect = (item: ListItem) => {
    const isChecked = effectiveSelectedIds.includes(item.id)
    if (isChecked) {
      setInternalSelectedIds(effectiveSelectedIds.filter(id => id !== item.id))
      onToggle?.(item.id, false)
    } else {
      setInternalSelectedIds([...effectiveSelectedIds, item.id])
      onToggle?.(item.id, true)
    }
  }
  
  return (
    <List
      {...props}
      items={items}
      onSelect={handleSelect}
      renderItem={renderItem || ((item, _, isFocused) => (
        <Row gap={1}>
          <Text style={{ inverse: isFocused }}>
            {effectiveSelectedIds.includes(item.id) ? '[✓]' : '[ ]'}
          </Text>
          <Text style={{ 
            inverse: isFocused,
            dim: item.disabled,
          }}>
            {item.label}
          </Text>
        </Row>
      ))}
    />
  )
}

// Select list (alias for backward compatibility)
export const SelectList = List