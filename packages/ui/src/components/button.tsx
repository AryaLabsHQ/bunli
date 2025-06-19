/**
 * Button component
 */

import React from 'react'
import { Box, Text } from '@bunli/renderer'
import type { BoxProps } from '@bunli/renderer'
import type { Style } from '../types.js'
import { useFocus } from '../focus/use-focus.js'
import { keyboardManager } from '../focus/keyboard-manager.js'

export interface ButtonProps extends Omit<BoxProps, 'children'> {
  /**
   * Button label
   */
  children: React.ReactNode
  /**
   * Click handler
   */
  onClick?: () => void
  /**
   * Is the button focused? (controlled)
   */
  focused?: boolean
  /**
   * Auto-focus on mount
   */
  autoFocus?: boolean
  /**
   * Tab index for focus order
   */
  tabIndex?: number
  /**
   * Is the button disabled?
   */
  disabled?: boolean
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  /**
   * Button size
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Full width button
   */
  fullWidth?: boolean
  /**
   * Focus handler
   */
  onFocus?: () => void
  /**
   * Blur handler
   */
  onBlur?: () => void
}

const variantStyles: Record<string, Style> = {
  primary: {
    border: 'single' as const,
    backgroundColor: 'blue',
    color: 'white',
  },
  secondary: {
    border: 'single' as const,
    color: 'blue',
  },
  danger: {
    border: 'single' as const,
    backgroundColor: 'red',
    color: 'white',
  },
  success: {
    border: 'single' as const,
    backgroundColor: 'green',
    color: 'white',
  },
}

const sizeStyles: Record<string, Style> = {
  small: {
    padding: [0, 1],
  },
  medium: {
    padding: [0, 2],
  },
  large: {
    padding: [1, 3],
  },
}

export function Button({
  children,
  onClick,
  focused: controlledFocused,
  autoFocus = false,
  tabIndex = 0,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  onFocus,
  onBlur,
  style,
  ...props
}: ButtonProps) {
  const { isFocused, focusProps } = useFocus({
    canFocus: !disabled,
    tabIndex,
    autoFocus,
    onFocus,
    onBlur,
  })
  
  const focused = controlledFocused ?? isFocused
  
  // Handle keyboard activation
  React.useEffect(() => {
    if (!focused || disabled) return
    
    const handleKey = (event: any) => {
      if (event.name === 'enter' || event.name === 'space') {
        onClick?.()
        return true
      }
      return false
    }
    
    keyboardManager.on('key', handleKey)
    return () => {
      keyboardManager.off('key', handleKey)
    }
  }, [focused, disabled, onClick])
  
  const variantStyle = variantStyles[variant]
  const sizeStyle = sizeStyles[size]
  
  return (
    <Box
      style={{
        ...sizeStyle,
        ...variantStyle,
        ...(focused && !disabled ? { inverse: true } : {}),
        ...(disabled ? { dim: true } : {}),
        ...(fullWidth ? { width: '100%' } : {}),
        ...style,
      }}
      {...props}
    >
      <Text style={{ 
        bold: variant === 'primary',
        align: 'center' 
      }}>
        {children}
      </Text>
    </Box>
  )
}

// Button group component
export interface ButtonGroupProps extends Omit<BoxProps, 'children'> {
  children: React.ReactNode
  /**
   * Spacing between buttons
   */
  spacing?: number
}

export function ButtonGroup({
  children,
  spacing = 1,
  ...props
}: ButtonGroupProps) {
  return (
    <Box
      direction="horizontal"
      gap={spacing}
      {...props}
    >
      {children}
    </Box>
  )
}