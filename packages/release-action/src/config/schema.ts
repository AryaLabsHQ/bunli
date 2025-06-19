import type { BunliReleaseConfig } from '../types.js'

export function validateConfig(rawConfig: any): Partial<BunliReleaseConfig> {
  if (!rawConfig || typeof rawConfig !== 'object') {
    throw new Error('Config must be an object')
  }

  // Basic validation - we'll expand this later
  const config: Partial<BunliReleaseConfig> = {}

  // Validate version
  if ('version' in rawConfig) {
    if (typeof rawConfig.version !== 'number' || rawConfig.version !== 1) {
      throw new Error('Config version must be 1')
    }
    config.version = rawConfig.version
  }

  // Validate project
  if ('project' in rawConfig) {
    if (!rawConfig.project || typeof rawConfig.project !== 'object') {
      throw new Error('Project must be an object')
    }
    if (!rawConfig.project.name || typeof rawConfig.project.name !== 'string') {
      throw new Error('Project name is required and must be a string')
    }
    config.project = rawConfig.project
  }

  // Copy other fields (we'll add more validation later)
  const fields = ['builds', 'archives', 'checksum', 'changelog', 'npm', 'homebrew', 'release']
  for (const field of fields) {
    if (field in rawConfig) {
      (config as any)[field] = rawConfig[field]
    }
  }

  return config
}