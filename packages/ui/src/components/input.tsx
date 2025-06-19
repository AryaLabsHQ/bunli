/**
 * Input component for text entry
 */

import React, { useState, useEffect, useRef } from 'react'
import { Box, Text, Row } from '@bunli/renderer'
import type { BoxProps } from '@bunli/renderer'
import { useFocus } from '../focus/use-focus.js'
import { keyboardManager } from '../focus/keyboard-manager.js'

export interface InputProps extends Omit<BoxProps, 'children'> {
  /**
   * Current value
   */
  value?: string
  /**
   * Placeholder text
   */
  placeholder?: string
  /**
   * Called when value changes
   */
  onChange?: (value: string) => void
  /**
   * Called when Enter is pressed
   */
  onSubmit?: (value: string) => void
  /**
   * Is the input focused? (controlled)
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
   * Width of the input
   */
  width?: number
  /**
   * Password mode (show * instead of characters)
   */
  password?: boolean
  /**
   * Show cursor
   */
  showCursor?: boolean
  /**
   * Cursor character
   */
  cursorChar?: string
  /**
   * Label to show before input
   */
  label?: string
  /**
   * Maximum length
   */
  maxLength?: number
  /**
   * Focus handler
   */
  onFocus?: () => void
  /**
   * Blur handler
   */
  onBlur?: () => void
}

export function Input({
  value = '',
  placeholder = '',
  onChange,
  onSubmit,
  focused: controlledFocused,
  autoFocus = false,
  tabIndex = 0,
  width = 20,
  password = false,
  showCursor = true,
  cursorChar = '█',
  label,
  maxLength,
  onFocus,
  onBlur,
  style,
  ...props
}: InputProps) {
  const [cursorPosition, setCursorPosition] = useState(value.length)
  const [showBlink, setShowBlink] = useState(true)
  
  const { isFocused, focusProps } = useFocus({
    tabIndex,
    autoFocus,
    onFocus,
    onBlur,
  })
  
  const focused = controlledFocused ?? isFocused
  
  // Handle cursor blinking
  useEffect(() => {
    if (!focused || !showCursor) return
    
    const timer = setInterval(() => {
      setShowBlink(b => !b)
    }, 500)
    
    return () => clearInterval(timer)
  }, [focused, showCursor])
  
  // Update cursor position when value changes
  useEffect(() => {
    setCursorPosition(Math.min(cursorPosition, value.length))
  }, [value.length])
  
  // Handle keyboard input
  useEffect(() => {
    if (!focused) return
    
    const handleKey = (event: any) => {
      const { name, key } = event
      
      // Handle special keys
      switch (name) {
        case 'left':
          setCursorPosition(pos => Math.max(0, pos - 1))
          return true
          
        case 'right':
          setCursorPosition(pos => Math.min(value.length, pos + 1))
          return true
          
        case 'home':
        case 'ctrl+a':
          setCursorPosition(0)
          return true
          
        case 'end':
        case 'ctrl+e':
          setCursorPosition(value.length)
          return true
          
        case 'backspace':
          if (cursorPosition > 0) {
            const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition)
            onChange?.(newValue)
            setCursorPosition(pos => pos - 1)
          }
          return true
          
        case 'delete':
          if (cursorPosition < value.length) {
            const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1)
            onChange?.(newValue)
          }
          return true
          
        case 'enter':
          onSubmit?.(value)
          return true
          
        case 'ctrl+u':
          // Clear line
          onChange?.('')
          setCursorPosition(0)
          return true
          
        case 'ctrl+k':
          // Clear from cursor to end
          onChange?.(value.slice(0, cursorPosition))
          return true
          
        case 'ctrl+w':
          // Delete word before cursor
          const beforeCursor = value.slice(0, cursorPosition)
          const lastSpaceIndex = beforeCursor.lastIndexOf(' ')
          const deleteFrom = lastSpaceIndex === -1 ? 0 : lastSpaceIndex + 1
          const newValue = value.slice(0, deleteFrom) + value.slice(cursorPosition)
          onChange?.(newValue)
          setCursorPosition(deleteFrom)
          return true
          
        default:
          // Handle regular character input
          if (key.length === 1 && !event.ctrl && !event.meta) {
            if (!maxLength || value.length < maxLength) {
              const newValue = value.slice(0, cursorPosition) + key + value.slice(cursorPosition)
              onChange?.(newValue)
              setCursorPosition(pos => pos + 1)
            }
            return true
          }
      }
      
      return false
    }
    
    keyboardManager.on('key', handleKey)
    return () => {
      keyboardManager.off('key', handleKey)
    }
  }, [focused, value, cursorPosition, maxLength, onChange, onSubmit])
  
  // Render the input content
  const displayValue = password ? '•'.repeat(value.length) : value
  const paddedValue = displayValue + ' '.repeat(Math.max(0, width - displayValue.length - 1))
  
  // Insert cursor at position
  let content = paddedValue
  if (focused && showCursor && showBlink && cursorPosition <= paddedValue.length) {
    if (cursorPosition < paddedValue.length) {
      content = 
        paddedValue.slice(0, cursorPosition) +
        cursorChar +
        paddedValue.slice(cursorPosition + 1)
    } else {
      content = paddedValue + cursorChar
    }
  }
  
  // Show placeholder if empty and not focused
  if (!value && !focused && placeholder) {
    content = placeholder.slice(0, width).padEnd(width, ' ')
  }
  
  return (
    <Row gap={0}>
      {label && <Text>{label} </Text>}
      <Box 
        style={{
          border: focused ? 'single' : undefined,
          borderColor: focused ? 'blue' : undefined,
          padding: focused ? [0, 1] : 0,
          ...style
        }}
        {...props}
      >
        <Text style={{ 
          color: !value && !focused ? 'gray' : undefined,
          inverse: focused,
        }}>
          {content}
        </Text>
      </Box>
    </Row>
  )
}

// Alias for backward compatibility
export const TextInput = Input