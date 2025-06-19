/**
 * Focus management system for terminal UI
 */

import { EventEmitter } from 'events'

export interface FocusableElement {
  id: string
  onFocus?: () => void
  onBlur?: () => void
  canFocus?: boolean
  tabIndex?: number
}

export interface FocusContext {
  focusedId: string | null
  focusableElements: Map<string, FocusableElement>
  tabOrder: string[]
}

export class FocusManager extends EventEmitter {
  private focusedId: string | null = null
  private focusableElements = new Map<string, FocusableElement>()
  private focusStack: string[] = []
  
  constructor() {
    super()
    // Increase max listeners to prevent warnings
    this.setMaxListeners(50)
  }
  
  /**
   * Register a focusable element
   */
  register(element: FocusableElement): void {
    if (element.canFocus !== false) {
      this.focusableElements.set(element.id, element)
      this.emit('register', element.id)
    }
  }
  
  /**
   * Unregister a focusable element
   */
  unregister(id: string): void {
    const element = this.focusableElements.get(id)
    if (element) {
      if (this.focusedId === id) {
        this.blur()
      }
      this.focusableElements.delete(id)
      this.focusStack = this.focusStack.filter(stackId => stackId !== id)
      this.emit('unregister', id)
    }
  }
  
  /**
   * Focus an element by ID
   */
  focus(id: string): boolean {
    const element = this.focusableElements.get(id)
    if (!element || element.canFocus === false) {
      return false
    }
    
    // Blur current element
    if (this.focusedId && this.focusedId !== id) {
      const currentElement = this.focusableElements.get(this.focusedId)
      currentElement?.onBlur?.()
      this.emit('blur', this.focusedId)
    }
    
    // Focus new element
    this.focusedId = id
    this.focusStack.push(id)
    element.onFocus?.()
    this.emit('focus', id)
    
    return true
  }
  
  /**
   * Blur the currently focused element
   */
  blur(): void {
    if (this.focusedId) {
      const element = this.focusableElements.get(this.focusedId)
      element?.onBlur?.()
      this.emit('blur', this.focusedId)
      this.focusedId = null
    }
  }
  
  /**
   * Get the currently focused element ID
   */
  getFocusedId(): string | null {
    return this.focusedId
  }
  
  /**
   * Check if an element is focused
   */
  isFocused(id: string): boolean {
    return this.focusedId === id
  }
  
  /**
   * Get tab order (sorted by tabIndex)
   */
  getTabOrder(): string[] {
    const elements = Array.from(this.focusableElements.entries())
      .filter(([_, element]) => element.canFocus !== false)
      .sort(([_, a], [__, b]) => {
        const aIndex = a.tabIndex ?? 0
        const bIndex = b.tabIndex ?? 0
        return aIndex - bIndex
      })
    
    return elements.map(([id]) => id)
  }
  
  /**
   * Move focus to next element in tab order
   */
  focusNext(): boolean {
    const tabOrder = this.getTabOrder()
    if (tabOrder.length === 0) return false
    
    let currentIndex = -1
    if (this.focusedId) {
      currentIndex = tabOrder.indexOf(this.focusedId)
    }
    
    const nextIndex = (currentIndex + 1) % tabOrder.length
    const nextId = tabOrder[nextIndex]
    if (nextId) {
      return this.focus(nextId)
    }
    return false
  }
  
  /**
   * Move focus to previous element in tab order
   */
  focusPrevious(): boolean {
    const tabOrder = this.getTabOrder()
    if (tabOrder.length === 0) return false
    
    let currentIndex = 0
    if (this.focusedId) {
      currentIndex = tabOrder.indexOf(this.focusedId)
    }
    
    const prevIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length
    const prevId = tabOrder[prevIndex]
    if (prevId) {
      return this.focus(prevId)
    }
    return false
  }
  
  /**
   * Restore focus to previous element
   */
  restoreFocus(): boolean {
    // Remove current from stack
    if (this.focusedId) {
      this.focusStack.pop()
    }
    
    // Find previous valid element
    while (this.focusStack.length > 0) {
      const id = this.focusStack[this.focusStack.length - 1]
      if (id && this.focusableElements.has(id)) {
        return this.focus(id)
      }
      this.focusStack.pop()
    }
    
    return false
  }
  
  /**
   * Clear all focus
   */
  clear(): void {
    this.blur()
    this.focusableElements.clear()
    this.focusStack = []
  }
}

// Global focus manager instance
export const focusManager = new FocusManager()