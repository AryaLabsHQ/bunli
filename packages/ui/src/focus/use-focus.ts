/**
 * React hooks for focus management
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { focusManager } from './focus-manager.js'
import type { FocusableElement } from './focus-manager.js'

export interface UseFocusOptions {
  /**
   * Whether the element can receive focus
   */
  canFocus?: boolean
  /**
   * Tab index for focus order
   */
  tabIndex?: number
  /**
   * Called when element receives focus
   */
  onFocus?: () => void
  /**
   * Called when element loses focus
   */
  onBlur?: () => void
  /**
   * Auto-focus on mount
   */
  autoFocus?: boolean
}

export interface UseFocusResult {
  /**
   * Whether the element is currently focused
   */
  isFocused: boolean
  /**
   * Focus this element
   */
  focus: () => void
  /**
   * Blur this element
   */
  blur: () => void
  /**
   * Props to spread on the element
   */
  focusProps: {
    focused: boolean
  }
}

/**
 * Hook for managing focus on an element
 */
export function useFocus(options: UseFocusOptions = {}): UseFocusResult {
  const {
    canFocus = true,
    tabIndex = 0,
    onFocus,
    onBlur,
    autoFocus = false,
  } = options
  
  const idRef = useRef<string | undefined>(undefined)
  const [isFocused, setIsFocused] = useState(false)
  
  // Generate stable ID
  if (!idRef.current) {
    idRef.current = `focus-${Math.random().toString(36).slice(2, 9)}`
  }
  
  const id = idRef.current
  
  // Focus handlers
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocus?.()
  }, [onFocus])
  
  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.()
  }, [onBlur])
  
  // Focus actions
  const focus = useCallback(() => {
    focusManager.focus(id)
  }, [id])
  
  const blur = useCallback(() => {
    if (focusManager.isFocused(id)) {
      focusManager.blur()
    }
  }, [id])
  
  // Register with focus manager
  useEffect(() => {
    const element: FocusableElement = {
      id,
      canFocus,
      tabIndex,
      onFocus: handleFocus,
      onBlur: handleBlur,
    }
    
    focusManager.register(element)
    
    // Auto-focus if requested
    if (autoFocus && canFocus) {
      focus()
    }
    
    return () => {
      focusManager.unregister(id)
    }
  }, [id, canFocus, tabIndex, handleFocus, handleBlur, autoFocus, focus])
  
  // Listen for focus changes
  useEffect(() => {
    const handleFocusChange = (focusedId: string) => {
      setIsFocused(focusedId === id)
    }
    
    focusManager.on('focus', handleFocusChange)
    focusManager.on('blur', handleFocusChange)
    
    return () => {
      focusManager.off('focus', handleFocusChange)
      focusManager.off('blur', handleFocusChange)
    }
  }, [id])
  
  return {
    isFocused,
    focus,
    blur,
    focusProps: {
      focused: isFocused,
    },
  }
}

/**
 * Hook for managing focus within a container
 */
export interface UseFocusScopeOptions {
  /**
   * Restore focus when unmounted
   */
  restoreFocus?: boolean
  /**
   * Contain focus within scope
   */
  contain?: boolean
  /**
   * Auto-focus first element
   */
  autoFocus?: boolean
}

export function useFocusScope(options: UseFocusScopeOptions = {}) {
  const {
    restoreFocus = true,
    contain = false,
    autoFocus = false,
  } = options
  
  const previousFocusRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Store current focus
    if (restoreFocus) {
      previousFocusRef.current = focusManager.getFocusedId()
    }
    
    // Auto-focus first element
    if (autoFocus) {
      const tabOrder = focusManager.getTabOrder()
      if (tabOrder.length > 0 && tabOrder[0]) {
        focusManager.focus(tabOrder[0])
      }
    }
    
    return () => {
      // Restore previous focus
      if (restoreFocus && previousFocusRef.current) {
        focusManager.focus(previousFocusRef.current)
      }
    }
  }, [restoreFocus, autoFocus])
  
  // TODO: Implement focus containment
  // This would require tracking all focusable elements within the scope
  // and preventing focus from moving outside
}

/**
 * Hook for keyboard navigation
 */
export interface UseKeyboardNavigationOptions {
  /**
   * Navigate with arrow keys
   */
  arrowNavigation?: boolean
  /**
   * Navigate with tab key
   */
  tabNavigation?: boolean
  /**
   * Custom key handlers
   */
  onKeyDown?: (key: string) => void
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const {
    arrowNavigation = false,
    tabNavigation = true,
    onKeyDown,
  } = options
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = (event as any).key as string
      
      // Custom handler
      onKeyDown?.(key)
      
      // Tab navigation
      if (tabNavigation) {
        if (key === 'Tab') {
          event.preventDefault()
          if ((event as any).shiftKey) {
            focusManager.focusPrevious()
          } else {
            focusManager.focusNext()
          }
        }
      }
      
      // Arrow navigation
      if (arrowNavigation) {
        switch (key) {
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault()
            focusManager.focusNext()
            break
          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault()
            focusManager.focusPrevious()
            break
        }
      }
    }
    
    // Add listener
    // Note: Since we're in a terminal environment, we don't have window object
    // The keyboard events are handled by the KeyboardManager instead
    return undefined
  }, [arrowNavigation, tabNavigation, onKeyDown])
}