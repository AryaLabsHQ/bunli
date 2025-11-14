export interface GeneratorConfig {
  commandsDir: string
  outputFile: string
  config?: any
  generateReport?: boolean
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
  // Support for handler and render properties
  hasHandler?: boolean
  hasRender?: boolean
  // Enhanced: Positional arguments support (future)
  positionalArgs?: PositionalArgMetadata[]
}

export interface PositionalArgMetadata {
  name: string
  description?: string
  type: string
  required: boolean
  variadic?: boolean  // For ...args patterns
  enumValues?: string[]
}

export interface OptionMetadata {
  type: string
  required: boolean
  hasDefault: boolean
  default?: any
  description?: string
  short?: string
  // Enhanced schema information for completions
  schema?: any
  validator?: string
  // Completion-specific metadata
  enumValues?: (string | number)[]  // For z.enum(['a', 'b', 'c'])
  literalValue?: string | number | boolean  // For z.literal('value')
  minLength?: number  // For z.string().min(n)
  maxLength?: number  // For z.string().max(n)
  pattern?: string  // For z.string().regex(/pattern/)
  min?: number  // For z.number().min(n)
  max?: number  // For z.number().max(n)
  isArray?: boolean  // For z.array()
  isTransform?: boolean  // Has .transform()
  isRefine?: boolean  // Has .refine()
  fileType?: 'file' | 'directory' | 'path'  // For file path completions
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
