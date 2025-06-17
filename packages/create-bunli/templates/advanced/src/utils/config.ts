import { CONFIG_FILE_NAME, DEFAULT_CONFIG } from './constants.js'
import path from 'node:path'

export interface Config {
  rules?: Record<string, any>
  server?: {
    port?: number
    host?: string
    open?: boolean
    cors?: boolean
  }
  include?: string[]
  exclude?: string[]
  cache?: {
    enabled?: boolean
    directory?: string
  }
  hooks?: {
    beforeValidate?: (files: string[]) => Promise<void>
    afterValidate?: (results: any) => Promise<void>
  }
}

let cachedConfig: Config | null = null

export async function loadConfig(configPath?: string): Promise<Config> {
  // Return cached config if available
  if (cachedConfig && !configPath) {
    return cachedConfig
  }
  
  const finalPath = configPath || path.join(process.cwd(), CONFIG_FILE_NAME)
  
  try {
    // Check if config file exists
    const file = Bun.file(finalPath)
    if (!(await file.exists())) {
      return DEFAULT_CONFIG
    }
    
    // Import the config file
    const configModule = await import(finalPath)
    const config = configModule.default || configModule
    
    // Merge with defaults
    cachedConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      server: {
        ...DEFAULT_CONFIG.server,
        ...(config.server || {})
      }
    }
    
    return cachedConfig
  } catch (error) {
    console.warn(`Failed to load config from ${finalPath}:`, error)
    return DEFAULT_CONFIG
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)
  
  // Convert config to ES module format
  const content = `export default ${JSON.stringify(config, null, 2)}`
  
  await Bun.write(configPath, content)
  
  // Clear cache
  cachedConfig = null
}

export async function getConfigPath(): Promise<string> {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME)
  const file = Bun.file(configPath)
  
  if (await file.exists()) {
    return configPath
  }
  
  return 'No config file found'
}