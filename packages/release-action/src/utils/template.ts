import type { TemplateContext } from '../types.js'

export class TemplateEngine {
  private context: TemplateContext

  constructor(context: TemplateContext) {
    this.context = context
  }

  render(template: string): string {
    return template.replace(/\{\{\.(\w+)\}\}/g, (match, key) => {
      const value = this.getValue(key)
      return value !== undefined ? String(value) : match
    })
  }

  private getValue(key: string): any {
    if (key in this.context) {
      return (this.context as any)[key]
    }

    // Handle nested Env values
    if (key.startsWith('Env.')) {
      const envKey = key.substring(4)
      return this.context.Env[envKey]
    }

    return undefined
  }

  static createContext(
    base: Partial<TemplateContext>,
    overrides?: Partial<TemplateContext>
  ): TemplateContext {
    const defaults: TemplateContext = {
      ProjectName: '',
      Version: '',
      Tag: '',
      Date: new Date().toISOString().split('T')[0] || '',
      Commit: '',
      Env: process.env as Record<string, string>
    }
    
    return {
      ...defaults,
      ...base,
      ...overrides
    } as TemplateContext
  }
}