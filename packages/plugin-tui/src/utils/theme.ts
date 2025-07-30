import type { CliRenderer, RGBA } from '@opentui/core'
import type { ThemeConfig } from '../types.js'
import { parseColor } from '@opentui/core'

const darkTheme: ThemeConfig = {
  name: 'dark',
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#1e293b',
    foreground: '#f1f5f9',
    border: '#475569',
    focusBorder: '#3b82f6',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    inputBackground: '#0f172a',
    inputBorder: '#334155',
    buttonPrimary: '#3b82f6',
    buttonSecondary: '#64748b'
  }
}

const lightTheme: ThemeConfig = {
  name: 'light',
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    background: '#ffffff',
    foreground: '#0f172a',
    border: '#e2e8f0',
    focusBorder: '#2563eb',
    error: '#dc2626',
    success: '#059669',
    warning: '#d97706',
    info: '#2563eb',
    inputBackground: '#f8fafc',
    inputBorder: '#cbd5e1',
    buttonPrimary: '#2563eb',
    buttonSecondary: '#64748b'
  }
}

export function getDefaultTheme(name: 'light' | 'dark'): ThemeConfig {
  return name === 'light' ? lightTheme : darkTheme
}

export function applyTheme(renderer: CliRenderer, theme: ThemeConfig) {
  // Set background color
  const bgColor = typeof theme.colors.background === 'string' 
    ? parseColor(theme.colors.background)
    : theme.colors.background
  
  renderer.setBackgroundColor(bgColor)
  
  // Store theme in renderer for components to access
  ;(renderer as any).__theme = theme
}

export function getTheme(renderer: CliRenderer): ThemeConfig | null {
  return (renderer as any).__theme || null
}

export function resolveColor(color: RGBA | string): RGBA {
  return typeof color === 'string' ? parseColor(color) : color
}