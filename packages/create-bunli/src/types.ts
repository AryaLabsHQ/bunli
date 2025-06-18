export interface CreateOptions {
  template?: string
  install?: boolean
  git?: boolean
  offline?: boolean
}

export interface ProjectConfig {
  name: string
  template: string
  install: boolean
  git: boolean
  offline?: boolean
}

export interface TemplateManifest {
  name?: string
  description?: string
  variables?: TemplateVariable[]
  files?: {
    include?: string[]
    exclude?: string[]
  }
  hooks?: {
    postInstall?: string[]
  }
  requirements?: {
    node?: string
    bun?: string
  }
}

export interface TemplateVariable {
  name: string
  message: string
  type?: 'string' | 'boolean' | 'number' | 'select'
  default?: any
  choices?: Array<{ label: string; value: any }>
  validate?: (value: any) => boolean | string
}

// Legacy types for backward compatibility during refactor
export interface Template {
  name: string
  description: string
  files: Record<string, string>
}