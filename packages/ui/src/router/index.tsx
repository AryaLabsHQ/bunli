/**
 * Simple router for terminal applications
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Box, Text } from '../reconciler/components.js'
import { keyboardManager } from '../focus/keyboard-manager.js'

export interface Route {
  path: string
  component: React.ComponentType<any>
  title?: string
}

interface RouterContextValue {
  currentPath: string
  navigate: (path: string) => void
  back: () => void
  routes: Route[]
  history: string[]
}

const RouterContext = createContext<RouterContextValue>(null!)

export interface RouterProps {
  routes: Route[]
  initialPath?: string
  children?: React.ReactNode
  onNavigate?: (path: string) => void
}

export function Router({ 
  routes, 
  initialPath = '/', 
  children,
  onNavigate 
}: RouterProps) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [history, setHistory] = useState<string[]>([initialPath])
  
  const navigate = (path: string) => {
    if (path !== currentPath) {
      setHistory(prev => [...prev, path])
      setCurrentPath(path)
      onNavigate?.(path)
    }
  }
  
  const back = () => {
    if (history.length > 1) {
      const newHistory = [...history]
      newHistory.pop() // Remove current
      const previousPath = newHistory[newHistory.length - 1]
      if (previousPath) {
        setHistory(newHistory)
        setCurrentPath(previousPath)
        onNavigate?.(previousPath)
      }
    }
  }
  
  // Find current route
  const currentRoute = routes.find(r => r.path === currentPath)
  const Component = currentRoute?.component
  
  // Global navigation shortcuts
  useEffect(() => {
    const handleKey = (event: any) => {
      // Alt+Left to go back
      if (event.name === 'left' && event.meta) {
        back()
        return true
      }
      
      // Number keys to jump to route by index
      if (/^[1-9]$/.test(event.key) && !event.ctrl && !event.meta) {
        const index = parseInt(event.key) - 1
        const route = routes[index]
        if (route) {
          navigate(route.path)
        }
        return true
      }
      
      return false
    }
    
    keyboardManager.on('key', handleKey)
    return () => {
      keyboardManager.off('key', handleKey)
    }
  }, [routes, currentPath])
  
  if (children) {
    // Custom layout provided
    return (
      <RouterContext.Provider value={{ currentPath, navigate, back, routes, history }}>
        {children}
      </RouterContext.Provider>
    )
  }
  
  // Default layout
  return (
    <RouterContext.Provider value={{ currentPath, navigate, back, routes, history }}>
      <Box>
        {Component ? (
          <Component />
        ) : (
          <Box style={{ padding: 2 }}>
            <Text style={{ color: 'red' }}>404 - Route not found: {currentPath}</Text>
          </Box>
        )}
      </Box>
    </RouterContext.Provider>
  )
}

/**
 * Hook to access router context
 */
export function useRouter() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used within a Router')
  }
  return context
}

/**
 * Navigation component
 */
export interface NavLinkProps {
  to: string
  children: React.ReactNode
  style?: any
  activeStyle?: any
}

export function NavLink({ to, children, style, activeStyle }: NavLinkProps) {
  const { currentPath, navigate } = useRouter()
  const isActive = currentPath === to
  
  return (
    <Text
      style={{
        ...style,
        ...(isActive ? activeStyle : {}),
        cursor: 'pointer'
      }}
      onClick={() => navigate(to)}
    >
      {children}
    </Text>
  )
}

/**
 * Breadcrumb navigation
 */
export function Breadcrumbs() {
  const { history, navigate } = useRouter()
  
  return (
    <Box direction="horizontal" gap={1}>
      {history.map((path, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Text style={{ dim: true }}>/</Text>}
          <Text
            style={{ 
              cursor: index < history.length - 1 ? 'pointer' : undefined,
              dim: index < history.length - 1,
              bold: index === history.length - 1
            }}
            onClick={() => {
              if (index < history.length - 1) {
                // Navigate back to this point in history
                const newHistory = history.slice(0, index + 1)
                navigate(path)
              }
            }}
          >
            {path === '/' ? 'Home' : path.slice(1)}
          </Text>
        </React.Fragment>
      ))}
    </Box>
  )
}

/**
 * Tab-based navigation
 */
export function RouteTabBar() {
  const { routes, currentPath, navigate } = useRouter()
  
  return (
    <Box direction="horizontal" gap={2} style={{ borderBottom: 'single', padding: [0, 1] }}>
      {routes.map((route, index) => (
        <Text
          key={route.path}
          style={{
            bold: currentPath === route.path,
            color: currentPath === route.path ? 'blue' : undefined,
            cursor: 'pointer'
          }}
          onClick={() => navigate(route.path)}
        >
          {index + 1}. {route.title || route.path}
        </Text>
      ))}
    </Box>
  )
}