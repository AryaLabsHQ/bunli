import type { CliRenderer, Renderable, RGBA } from '@opentui/core'
import type { Command, CommandContext } from '@bunli/core'

export interface TuiPluginOptions {
  // Theme configuration
  theme?: 'light' | 'dark' | ThemeConfig
  
  // Default behavior when --interactive is used
  autoForm?: boolean
  
  // Global keyboard shortcuts
  shortcuts?: Record<string, string>
  
  // Renderer options
  renderer?: {
    fps?: number
    mouseSupport?: boolean
    exitOnCtrlC?: boolean
  }
}

export interface TuiStore {
  renderer: CliRenderer | null
  activeView: Renderable | null
  formValues: Map<string, any>
  options: TuiPluginOptions
}

export interface ThemeConfig {
  name: string
  colors: {
    primary: RGBA | string
    secondary: RGBA | string
    background: RGBA | string
    foreground: RGBA | string
    border: RGBA | string
    focusBorder: RGBA | string
    error: RGBA | string
    success: RGBA | string
    warning: RGBA | string
    info: RGBA | string
    // Component specific
    inputBackground: RGBA | string
    inputBorder: RGBA | string
    buttonPrimary: RGBA | string
    buttonSecondary: RGBA | string
  }
}

export interface TuiContext {
  store: TuiStore
  command: Command
  args: string[]
}

// Note: The Command interface in @bunli/core already has the tui property
// We don't need to extend it here

export interface TuiConfig {
  // Custom UI component/view for this command
  component?: string | (() => Renderable)
  // Disable auto-form generation
  disableAutoForm?: boolean
  // Custom key handlers
  keyHandlers?: KeyHandler[]
}

export interface KeyHandler {
  key: string
  handler: (event: KeyboardEvent) => void | boolean
}

// Component-specific options
export interface ComponentOptions {
  id: string
  name: string
  label?: string
  required?: boolean
  disabled?: boolean
  visible?: boolean
  defaultValue?: any
  validator?: (value: any) => string | null
  // Layout
  x?: number
  y?: number
  width?: number | string
  height?: number | string
  // Styling
  className?: string
  style?: Partial<ComponentStyle>
}

export interface ComponentStyle {
  color: RGBA | string
  backgroundColor: RGBA | string
  borderColor: RGBA | string
  borderStyle: 'single' | 'double' | 'rounded' | 'none'
}