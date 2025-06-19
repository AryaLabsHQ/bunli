/**
 * Tabs component for tabbed interfaces
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, Row, Column } from '@bunli/renderer'
import type { BoxProps } from '@bunli/renderer'
import { useFocus } from '../focus/use-focus.js'
import { keyboardManager } from '../focus/keyboard-manager.js'

export interface Tab {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

export interface TabsProps extends Omit<BoxProps, 'children'> {
  /**
   * Tabs
   */
  tabs: Tab[]
  /**
   * Active tab ID
   */
  activeId?: string
  /**
   * Called when tab changes
   */
  onChange?: (tabId: string) => void
  /**
   * Tab position
   */
  position?: 'top' | 'bottom'
  /**
   * Tab alignment
   */
  align?: 'start' | 'center' | 'end'
  /**
   * Is the tab bar focused? (controlled)
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
}

export function Tabs({
  tabs,
  activeId: controlledActiveId,
  onChange,
  position = 'top',
  align = 'start',
  focused: controlledFocused,
  autoFocus = false,
  tabIndex = 0,
  onFocus,
  onBlur,
  style,
  ...props
}: TabsProps) {
  const [internalActiveId, setInternalActiveId] = useState(controlledActiveId || tabs[0]?.id)
  const [focusedIndex, setFocusedIndex] = useState(0)
  
  const activeId = controlledActiveId ?? internalActiveId
  const activeTab = tabs.find(t => t.id === activeId) || tabs[0]
  
  const { isFocused, focusProps } = useFocus({
    tabIndex,
    autoFocus,
    onFocus,
    onBlur,
  })
  
  const focused = controlledFocused ?? isFocused
  
  // Update focused index when active ID changes
  useEffect(() => {
    const index = tabs.findIndex(tab => tab.id === activeId)
    if (index !== -1) {
      setFocusedIndex(index)
    }
  }, [activeId, tabs])
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!focused) return
    
    const handleKey = (event: any) => {
      const { name } = event
      
      switch (name) {
        case 'left':
        case 'h':
          {
            const newIndex = Math.max(0, focusedIndex - 1)
            // Skip disabled tabs
            let targetIndex = newIndex
            while (targetIndex > 0 && tabs[targetIndex]?.disabled) {
              targetIndex--
            }
            if (!tabs[targetIndex]?.disabled) {
              setFocusedIndex(targetIndex)
            }
          }
          return true
          
        case 'right':
        case 'l':
          {
            const newIndex = Math.min(tabs.length - 1, focusedIndex + 1)
            // Skip disabled tabs
            let targetIndex = newIndex
            while (targetIndex < tabs.length - 1 && tabs[targetIndex]?.disabled) {
              targetIndex++
            }
            if (!tabs[targetIndex]?.disabled) {
              setFocusedIndex(targetIndex)
            }
          }
          return true
          
        case 'home':
          {
            // Find first non-disabled tab
            let targetIndex = 0
            while (targetIndex < tabs.length - 1 && tabs[targetIndex]?.disabled) {
              targetIndex++
            }
            if (!tabs[targetIndex]?.disabled) {
              setFocusedIndex(targetIndex)
            }
          }
          return true
          
        case 'end':
          {
            // Find last non-disabled tab
            let targetIndex = tabs.length - 1
            while (targetIndex > 0 && tabs[targetIndex]?.disabled) {
              targetIndex--
            }
            if (!tabs[targetIndex]?.disabled) {
              setFocusedIndex(targetIndex)
            }
          }
          return true
          
        case 'enter':
        case 'space':
          {
            const tab = tabs[focusedIndex]
            if (tab && !tab.disabled) {
              setInternalActiveId(tab.id)
              onChange?.(tab.id)
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
  }, [focused, focusedIndex, tabs, onChange])
  
  const tabBar = (
    <Row 
      gap={1} 
      style={{ 
        borderBottom: position === 'top' ? 'single' : undefined,
        borderTop: position === 'bottom' ? 'single' : undefined,
        justifyContent: align,
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab?.id
        const isFocused = focused && index === focusedIndex
        
        return (
          <Box
            key={tab.id}
            style={{
              padding: [0, 2],
              backgroundColor: isActive ? 'blue' : undefined,
              border: isActive && position === 'top' ? 'single' : undefined,
              borderBottom: isActive && position === 'top' ? false : undefined,
              borderTop: isActive && position === 'bottom' ? false : undefined,
              inverse: isFocused && !isActive,
              dim: tab.disabled,
            }}
          >
            <Text style={{ 
              bold: isActive,
              color: isActive ? 'white' : undefined,
            }}>
              {tab.label}
            </Text>
          </Box>
        )
      })}
    </Row>
  )
  
  const content = activeTab ? (
    <Box padding={1}>
      {activeTab.content}
    </Box>
  ) : null
  
  return (
    <Box style={style} {...props}>
      <Column gap={0}>
        {position === 'top' && tabBar}
        {content}
        {position === 'bottom' && tabBar}
      </Column>
    </Box>
  )
}

// Controlled tabs with state management
export function TabPanel({
  tabs,
  defaultActiveId,
  ...props
}: Omit<TabsProps, 'activeId'> & { defaultActiveId?: string }) {
  const [activeId, setActiveId] = useState(defaultActiveId || tabs[0]?.id)
  
  return (
    <Tabs
      {...props}
      tabs={tabs}
      activeId={activeId}
      onChange={id => {
        setActiveId(id)
        props.onChange?.(id)
      }}
    />
  )
}