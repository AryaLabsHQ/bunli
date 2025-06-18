/**
 * Config merger plugin for Bunli
 * Loads configuration from multiple sources and merges them
 */

import { readFile, access } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { createPlugin } from '@bunli/core/plugin'
import { deepMerge } from '@bunli/core/utils'
import type { BunliPlugin } from '@bunli/core/plugin'

export interface ConfigPluginOptions {
  /**
   * Config file sources to load
   * Supports template variables: {{name}} for app name
   * Default: ['~/.config/{{name}}/config.json', '.{{name}}rc', '.{{name}}rc.json']
   */
  sources?: string[]
  
  /**
   * Merge strategy
   * - 'deep': Recursively merge objects (default)
   * - 'shallow': Only merge top-level properties
   */
  mergeStrategy?: 'shallow' | 'deep'
  
  /**
   * Whether to stop on first found config
   * Default: false (loads and merges all found configs)
   */
  stopOnFirst?: boolean
}

/**
 * Config merger plugin factory
 */
export const configMergerPlugin = createPlugin((options: ConfigPluginOptions = {}) => {
  const sources = options.sources || [
    '~/.config/{{name}}/config.json',
    '.{{name}}rc',
    '.{{name}}rc.json',
    '.config/{{name}}.json'
  ]
  
  return {
    name: '@bunli/plugin-config',
    version: '1.0.0',
    
    async setup(context) {
      const appName = context.config.name || 'bunli'
      const configs: any[] = []
      
      for (const source of sources) {
        // Resolve template variables and home directory
        const path = source
          .replace(/^~/, homedir())
          .replace(/\{\{name\}\}/g, appName)
        
        try {
          // Check if file exists
          await access(path)
          
          // Read and parse config
          const content = await readFile(path, 'utf-8')
          let config: any
          
          try {
            config = JSON.parse(content)
          } catch (parseError) {
            context.logger.warn(`Failed to parse config file ${path}: ${parseError}`)
            continue
          }
          
          configs.push(config)
          context.logger.debug(`Loaded config from ${path}`)
          
          // Stop if requested
          if (options.stopOnFirst) {
            break
          }
        } catch {
          // File doesn't exist, skip silently
          context.logger.debug(`Config file not found: ${path}`)
        }
      }
      
      if (configs.length > 0) {
        // Merge all found configs
        let merged: any
        
        if (options.mergeStrategy === 'shallow') {
          merged = Object.assign({}, ...configs)
        } else {
          // Deep merge is already available
          merged = deepMerge(...configs)
        }
        
        context.updateConfig(merged)
        context.logger.info(`Merged ${configs.length} config file(s)`)
      }
    }
  } satisfies BunliPlugin
})

// Default export for convenience
export default configMergerPlugin