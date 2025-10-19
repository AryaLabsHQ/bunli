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
  exportPath: string
}

export interface OptionMetadata {
  type: string
  required: boolean
  default?: any
  description?: string
  short?: string
}

export interface CommandRegistry {
  [commandName: string]: {
    name: string
    description: string
    alias?: string | string[]
    options?: Record<string, OptionMetadata>
    filePath: string
    exportPath: string
  }
}
