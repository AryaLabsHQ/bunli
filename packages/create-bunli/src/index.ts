// Re-export utilities for programmatic usage
export { createProject } from './create-project.js'
export { processTemplate, resolveTemplateSource, isLocalTemplate } from './template-engine.js'
export type { CreateOptions, ProjectConfig, TemplateManifest, TemplateVariable } from './types.js'

// Version info
export const version = '0.1.0'