export interface GeneratorConfig {
  commandsDir: string
  outputFile: string
  config?: any
}

export interface GeneratorEvent {
  type: 'create' | 'update' | 'delete'
  path: string
}

export interface CommandMetadata {
  name: string
  description: string
  alias?: string | string[]
  options?: Record<string, OptionMetadata>
  commands?: CommandMetadata[]
  filePath: string
  importPath: string
  exportPath: string
  // NEW: Support for handler and render properties
  hasHandler?: boolean
  hasRender?: boolean
}

export interface OptionMetadata {
  type: string
  required: boolean
  hasDefault: boolean
  default?: any
  description?: string
  short?: string
  // NEW: Enhanced schema information
  schema?: any
  validator?: string
}

export interface CommandRegistry {
  [commandName: string]: {
    name: string
    description: string
    alias?: string | string[]
    options?: Record<string, OptionMetadata>
    filePath: string
    importPath: string
    exportPath: string
  }
}
