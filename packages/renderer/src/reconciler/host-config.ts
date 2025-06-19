/**
 * React Reconciler Host Config for Terminal UI
 * This tells React how to create and manipulate terminal elements
 */

import type { HostConfig } from 'react-reconciler'
import {
  createTerminalElement,
  createTerminalText,
  isTextNode,
  markLayoutDirty,
  markRegionDirty,
  findContainer,
  type TerminalContainer,
  type TerminalElement,
  type TerminalText,
  type TerminalNode,
} from './terminal-element.js'

// Type exports for the reconciler
export type Type = string
export type Props = Record<string, any>
export type Container = TerminalContainer
export type Instance = TerminalElement
export type TextInstance = TerminalText
export type SuspenseInstance = any
export type HydratableInstance = any
export type FormInstance = any
export type PublicInstance = TerminalElement | TerminalText
export type HostContext = {}
export type UpdatePayload = Array<[string, any]>
export type ChildSet = any
export type TimeoutHandle = ReturnType<typeof setTimeout>
export type NoTimeout = -1
export type TransitionStatus = any
export type NotPendingTransition = any
export type HostTransitionContext = any

// Priority levels for terminal updates
export const DiscreteEventPriority = 1
export const ContinuousEventPriority = 4
export const DefaultEventPriority = 16
export const IdleEventPriority = 536870912

/**
 * Terminal Host Config implementation
 */
export const terminalHostConfig: HostConfig<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  FormInstance,
  PublicInstance,
  HostContext,
  ChildSet,
  TimeoutHandle,
  NoTimeout,
  TransitionStatus
> = {
  // Core methods
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,

  // Context
  getRootHostContext(_rootContainer: Container): HostContext | null {
    return {}
  },

  getChildHostContext(
    _parentHostContext: HostContext,
    _type: Type,
    _rootContainer: Container
  ): HostContext {
    return {}
  },

  // Instance creation
  createInstance(
    type: Type,
    props: Props,
    _rootContainer: Container,
    _hostContext: HostContext,
    _internalHandle: any
  ): Instance {
    // Map terminal-* types to simpler names
    let elementType = type
    if (type.startsWith('terminal-')) {
      elementType = type.slice('terminal-'.length)
    }
    
    const element = createTerminalElement(elementType, props)
    return element
  },

  createTextInstance(
    text: string,
    _rootContainer: Container,
    _hostContext: HostContext,
    _internalHandle: any
  ): TextInstance {
    return createTerminalText(text)
  },

  // Tree manipulation
  appendInitialChild(parent: Instance, child: Instance | TextInstance): void {
    child.parent = parent
    parent.children.push(child)
    markLayoutDirty(parent)
  },

  appendChild(parent: Instance, child: Instance | TextInstance): void {
    child.parent = parent
    parent.children.push(child)
    markLayoutDirty(parent)
  },

  appendChildToContainer(container: Container, child: Instance): void {
    container.root = child
    
    // Store container reference on root
    ;(child as any)._container = container
    
    // Mark entire container as dirty for initial render
    markRegionDirty(container, {
      x: 0,
      y: 0,
      width: container.width,
      height: container.height,
    })
  },

  insertBefore(
    parent: Instance,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance
  ): void {
    child.parent = parent
    const index = parent.children.indexOf(beforeChild)
    if (index >= 0) {
      parent.children.splice(index, 0, child)
    } else {
      parent.children.push(child)
    }
    markLayoutDirty(parent)
  },

  insertInContainerBefore(
    _container: Container,
    _child: Instance,
    _beforeChild: Instance
  ): void {
    // Terminal UI typically has single root
    console.warn('insertInContainerBefore not implemented')
  },

  removeChild(parent: Instance, child: Instance | TextInstance): void {
    const index = parent.children.indexOf(child)
    if (index >= 0) {
      parent.children.splice(index, 1)
      child.parent = null
      markLayoutDirty(parent)
      
      // Mark the area where the child was as dirty
      if (!isTextNode(child) && child.layout) {
        const container = findContainer(parent)
        if (container) {
          markRegionDirty(container, child.layout)
        }
      }
    }
  },

  removeChildFromContainer(container: Container, child: Instance): void {
    if (container.root === child) {
      container.root = null
      
      // Mark entire container as dirty
      markRegionDirty(container, {
        x: 0,
        y: 0,
        width: container.width,
        height: container.height,
      })
    }
  },

  // Updates
  commitUpdate(
    instance: Instance,
    _type: Type,
    oldProps: Props,
    newProps: Props,
    _internalHandle: any
  ): void {
    // Create new props object
    instance.props = { ...newProps }
    
    // Check what needs updating
    let needsLayout = false
    let needsStyle = false
    
    // Compare props to determine what changed
    const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)])
    
    for (const key of allKeys) {
      if (key === 'children') continue
      
      if (oldProps[key] !== newProps[key]) {
        // Check if this prop affects layout
        if (
          key === 'width' ||
          key === 'height' ||
          key === 'padding' ||
          key === 'margin' ||
          key === 'flex' ||
          key === 'direction' ||
          key === 'gap'
        ) {
          needsLayout = true
        }
        
        // Check if this prop affects style
        if (key === 'style') {
          needsStyle = true
          
          // Check if style changes affect layout
          const oldStyle = oldProps.style || {}
          const newStyle = newProps.style || {}
          const layoutStyleProps = ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight']
          
          for (const styleProp of layoutStyleProps) {
            if (oldStyle[styleProp] !== newStyle[styleProp]) {
              needsLayout = true
              break
            }
          }
        }
      }
    }
    
    if (needsLayout) {
      markLayoutDirty(instance)
    }
    
    if (needsStyle) {
      instance.dirtyStyle = true
    }
    
    // Mark region as dirty if we have layout info
    if (instance.layout) {
      const container = getRootContainer(instance)
      if (container) {
        markRegionDirty(container, instance.layout)
      }
    }
  },

  commitTextUpdate(
    textInstance: TextInstance,
    _oldText: string,
    newText: string
  ): void {
    textInstance.text = newText
    
    // Mark parent as needing layout
    if (textInstance.parent && !isTextNode(textInstance.parent)) {
      markLayoutDirty(textInstance.parent)
      
      // Mark region as dirty
      if (textInstance.parent.layout) {
        const container = getRootContainer(textInstance.parent)
        if (container) {
          markRegionDirty(container, textInstance.parent.layout)
        }
      }
    }
  },

  // Commit phase
  prepareForCommit(_container: Container): Record<string, any> | null {
    // Save any terminal state we need to restore
    return {
      cursorPosition: { x: 0, y: 0 }, // TODO: Get actual cursor position
    }
  },

  resetAfterCommit(container: Container): void {
    // This is where we actually render to the terminal
    if (container.root) {
      // Import at the top of the function to avoid circular dependency
      const { performLayout } = require('./layout.js')
      const { renderToTerminal } = require('./terminal-renderer.js')
      
      // Perform layout calculation
      performLayout(container)
      
      // Render to terminal using differential rendering
      renderToTerminal(container)
    }
  },

  // Text content
  shouldSetTextContent(_type: Type, props: Props): boolean {
    // We handle text as separate text instances
    return typeof props.children === 'string' || typeof props.children === 'number'
  },

  // Scheduling
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1 as NoTimeout,
  
  // Microtasks
  supportsMicrotasks: true,
  scheduleMicrotask: 
    typeof queueMicrotask !== 'undefined' 
      ? queueMicrotask 
      : (callback: () => void) => Promise.resolve().then(callback),

  
  getInstanceFromNode(): null {
    return null
  },
  
  resolveUpdatePriority(): number {
    return DefaultEventPriority
  },
  
  shouldAttemptEagerTransition(): boolean {
    return false
  },
  
  getCurrentUpdatePriority(): number {
    return DefaultEventPriority
  },
  
  setCurrentUpdatePriority(_priority: number): void {
    // Not implemented
  },

  // Instance methods
  getPublicInstance(instance: Instance | TextInstance): PublicInstance {
    return instance
  },

  // Before/After hooks
  beforeActiveInstanceBlur(): void {
    // TODO: Handle focus blur
  },

  afterActiveInstanceBlur(): void {
    // TODO: Handle focus blur
  },

  prepareScopeUpdate(): void {
    // Not used for terminal UI
  },

  // Feature flags
  isPrimaryRenderer: true,
  warnsIfNotActing: true,

  // Not implemented (required by type but not used)
  getInstanceFromScope(): Instance | null {
    return null
  },

  // Portal support (not needed for terminal)
  preparePortalMount(): void {
    // Not used
  },


  // Final methods
  finalizeInitialChildren(
    _instance: Instance,
    _type: Type,
    _props: Props,
    _rootContainer: Container,
    _hostContext: HostContext
  ): boolean {
    // Return true if this element needs commitMount
    return false
  },

  commitMount(
    _instance: Instance,
    _type: Type,
    _props: Props,
    _internalHandle: any
  ): void {
    // Called for elements that need post-mount setup
  },


  // Content reset
  resetTextContent(_instance: Instance): void {
    _instance.children = []
    markLayoutDirty(_instance)
  },

  clearContainer(container: Container): void {
    container.root = null
    markRegionDirty(container, {
      x: 0,
      y: 0,
      width: container.width,
      height: container.height,
    })
  },
  
  // Suspense
  maySuspendCommit(_type: Type, _props: Props): boolean {
    return false
  },
  
  
  preloadInstance(_type: Type, _props: Props): boolean {
    return true
  },
  
  startSuspendingCommit(): void {},
  
  suspendInstance(_type: Type, _props: Props): void {},
  
  waitForCommitToBeReady():
    | ((initiateCommit: (...args: unknown[]) => unknown) => (...args: unknown[]) => unknown)
    | null {
    return null
  },

  // Error handling
  hideInstance(instance: Instance): void {
    // TODO: Implement hiding (remove from layout)
    instance.props.hidden = true
    markLayoutDirty(instance)
  },

  hideTextInstance(_textInstance: TextInstance): void {
    // TODO: Implement hiding for text
  },

  unhideInstance(instance: Instance): void {
    instance.props.hidden = false
    markLayoutDirty(instance)
  },

  unhideTextInstance(_textInstance: TextInstance): void {
    // TODO: Implement unhiding for text
  },
  
  detachDeletedInstance(_instance: Instance): void {
    // Clean up any resources associated with deleted instance
  },
  
  // Transition support
  NotPendingTransition: {} as NotPendingTransition,
  HostTransitionContext: {} as HostTransitionContext,
  
  // Form support
  resetFormInstance(_element: FormInstance): void {
    // Forms are not supported in terminal UI
  },
  
  // Paint callback
  requestPostPaintCallback(_callback: (time: number) => void): void {
    // Use next tick for terminal UI
    process.nextTick(() => _callback(Date.now()))
  },
  
  // Event tracking
  trackSchedulerEvent(): void {
    // Not needed for terminal UI
  },
  
  resolveEventType(): string | null {
    return null
  },
  
  resolveEventTimeStamp(): number {
    return Date.now()
  },
}

// Helper function to get root container from any node
function getRootContainer(node: TerminalNode): TerminalContainer | null {
  let current: TerminalNode | null = node
  
  while (current && current.parent) {
    current = current.parent
  }
  
  // Get container from root element
  if (current && !isTextNode(current)) {
    return (current as any)._container || null
  }
  
  return null
}