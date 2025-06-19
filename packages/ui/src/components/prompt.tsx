/**
 * Prompt-style components that match @bunli/utils aesthetics
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, Row, Column } from '../reconciler/components.js'
import { useFocus } from '../focus/use-focus.js'
import { keyboardManager } from '../focus/keyboard-manager.js'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export interface PromptInputProps {
  /**
   * The prompt message
   */
  message: string
  /**
   * Current value
   */
  value?: string
  /**
   * Called when value changes
   */
  onChange?: (value: string) => void
  /**
   * Called when user submits (Enter)
   */
  onSubmit?: (value: string) => void
  /**
   * Default value hint
   */
  defaultValue?: string
  /**
   * Validation schema
   */
  schema?: StandardSchemaV1
  /**
   * Password mode
   */
  password?: boolean
  /**
   * Auto-focus and show cursor
   */
  autoFocus?: boolean
  /**
   * Error message to display
   */
  error?: string
}

export function PromptInput({
  message,
  value = '',
  onChange,
  onSubmit,
  defaultValue,
  schema,
  password = false,
  autoFocus = true,
  error
}: PromptInputProps) {
  const [cursorPosition, setCursorPosition] = useState(value.length)
  const [showCursor, setShowCursor] = useState(true)
  const [validationError, setValidationError] = useState<string>()
  
  const { isFocused } = useFocus({ autoFocus })
  
  // Cursor blink
  useEffect(() => {
    if (!isFocused) {
      setShowCursor(false)
      return
    }
    setShowCursor(true)
    const timer = setInterval(() => setShowCursor(s => !s), 500)
    return () => clearInterval(timer)
  }, [isFocused])
  
  // Handle input
  useEffect(() => {
    if (!isFocused) return
    
    const handleKey = async (event: any) => {
      const { name, key } = event
      
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
          // Validate before submit
          if (schema) {
            const result = await schema['~standard'].validate(value)
            if (result.issues && result.issues.length > 0) {
              setValidationError(result.issues[0]?.message || 'Validation failed')
              return true
            }
          }
          setValidationError(undefined)
          onSubmit?.(value)
          return true
          
        case 'ctrl+u':
          onChange?.('')
          setCursorPosition(0)
          return true
          
        default:
          if (key.length === 1 && !event.ctrl && !event.meta) {
            const newValue = value.slice(0, cursorPosition) + key + value.slice(cursorPosition)
            onChange?.(newValue)
            setCursorPosition(pos => pos + 1)
            setValidationError(undefined) // Clear error on typing
            return true
          }
      }
      
      return false
    }
    
    keyboardManager.on('key', handleKey)
    return () => {
      keyboardManager.off('key', handleKey)
    }
  }, [isFocused, value, cursorPosition, onChange, onSubmit, schema])
  
  // Render the prompt line
  const defaultHint = defaultValue ? ` (${defaultValue})` : ''
  const promptText = `${message}${defaultHint} `
  
  // Display value with cursor
  let displayValue = password ? '•'.repeat(value.length) : value
  if (isFocused && showCursor) {
    if (cursorPosition < displayValue.length) {
      displayValue = 
        displayValue.slice(0, cursorPosition) + 
        '█' + 
        displayValue.slice(cursorPosition + 1)
    } else {
      displayValue += '█'
    }
  }
  
  return (
    <>
      <Row gap={0}>
        <Text>{promptText}</Text>
        <Text>{displayValue}</Text>
      </Row>
      {(error || validationError) && (
        <Box style={{ marginTop: 1 }}>
          <Text style={{ color: 'red' }}>Invalid input:</Text>
          <Text style={{ color: 'red', dim: true }}>  • {error || validationError}</Text>
        </Box>
      )}
    </>
  )
}

export interface PromptConfirmProps {
  /**
   * The prompt message
   */
  message: string
  /**
   * Default value
   */
  defaultValue?: boolean
  /**
   * Called when user confirms
   */
  onConfirm?: (value: boolean) => void
  /**
   * Auto-focus
   */
  autoFocus?: boolean
}

export function PromptConfirm({
  message,
  defaultValue,
  onConfirm,
  autoFocus = true
}: PromptConfirmProps) {
  const defaultHint = defaultValue === true ? 'Y/n' : defaultValue === false ? 'y/N' : 'y/n'
  const [input, setInput] = useState('')
  
  const { isFocused } = useFocus({ autoFocus })
  
  useEffect(() => {
    if (!isFocused) return
    
    const handleKey = (event: any) => {
      const { key } = event
      
      if (key === 'y' || key === 'Y') {
        setInput('y')
        setTimeout(() => onConfirm?.(true), 100)
        return true
      }
      
      if (key === 'n' || key === 'N') {
        setInput('n')
        setTimeout(() => onConfirm?.(false), 100)
        return true
      }
      
      if (event.name === 'enter' && defaultValue !== undefined) {
        onConfirm?.(defaultValue)
        return true
      }
      
      return false
    }
    
    keyboardManager.on('key', handleKey)
    return () => {
      keyboardManager.off('key', handleKey)
    }
  }, [isFocused, defaultValue, onConfirm])
  
  return (
    <Row gap={0}>
      <Text>{message} ({defaultHint}) </Text>
      <Text>{input}</Text>
    </Row>
  )
}

export interface PromptSelectProps<T = string> {
  /**
   * The prompt message
   */
  message: string
  /**
   * Options to select from
   */
  options: Array<{
    value: T
    label: string
    hint?: string
  }>
  /**
   * Called when user selects
   */
  onSelect?: (value: T) => void
  /**
   * Auto-focus
   */
  autoFocus?: boolean
}

export function PromptSelect<T = string>({
  message,
  options,
  onSelect,
  autoFocus = true
}: PromptSelectProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  
  const { isFocused } = useFocus({ autoFocus })
  
  useEffect(() => {
    if (!isFocused || submitted) return
    
    const handleKey = (event: any) => {
      const { name, key } = event
      
      // Handle arrow keys
      if (name === 'up' || key === 'k') {
        setSelectedIndex(i => Math.max(0, i - 1))
        return true
      }
      
      if (name === 'down' || key === 'j') {
        setSelectedIndex(i => Math.min(options.length - 1, i + 1))
        return true
      }
      
      // Handle selection
      if (name === 'enter' || name === 'space') {
        const selected = options[selectedIndex]
        if (selected) {
          setSubmitted(true)
          setTimeout(() => onSelect?.(selected.value), 100)
        }
        return true
      }
      
      // Handle number keys for quick selection
      if (/^[1-9]$/.test(key)) {
        const index = parseInt(key) - 1
        if (index < options.length) {
          setSelectedIndex(index)
          const selected = options[index]
          if (selected) {
            setSubmitted(true)
            setTimeout(() => onSelect?.(selected.value), 100)
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
  }, [isFocused, submitted, selectedIndex, options, onSelect])
  
  
  if (submitted) {
    const selected = options[selectedIndex]
    return <Text>✓ {selected?.label}</Text>
  }
  
  return (
    <Column gap={0}>
      <Text>{message}</Text>
      {options.map((option, index) => {
        const isSelected = index === selectedIndex
        const prefix = isSelected ? '❯ ' : '  '
        const hint = option.hint ? ` (${option.hint})` : ''
        
        return (
          <Text 
            key={index} 
            style={{ 
              color: isSelected ? 'cyan' : undefined,
              bold: isSelected
            }}
          >
            {prefix}{option.label}{hint}
          </Text>
        )
      })}
    </Column>
  )
}