import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { CONFIG_FILE_NAME, DEFAULT_CONFIG } from '../utils/constants.js'

export const initCommand = defineCommand({
  name: 'init',
  description: 'Initialize a new configuration file',
  options: {
    force: option(
      z.boolean().default(false),
      { 
        short: 'f',
        description: 'Overwrite existing config' 
      }
    ),
    template: option(
      z.enum(['minimal', 'default', 'full']).default('default'),
      {
        short: 't',
        description: 'Config template to use'
      }
    )
  },
  handler: async ({ flags, colors, prompt, spinner }) => {
    const configPath = `${process.cwd()}/${CONFIG_FILE_NAME}`
    
    // Check if config already exists
    const configFile = Bun.file(configPath)
    if (await configFile.exists() && !flags.force) {
      const overwrite = await prompt.confirm(
        `Config file already exists. Overwrite?`,
        { default: false }
      )
      
      if (!overwrite) {
        console.log(colors.yellow('Init cancelled'))
        return
      }
    }
    
    const spin = spinner('Creating config file...')
    spin.start()
    
    try {
      // Get template content
      const configContent = getConfigTemplate(flags.template)
      
      // Write config file
      await Bun.write(configPath, configContent)
      
      spin.succeed('Config file created')
      console.log(colors.dim(`  ${CONFIG_FILE_NAME}`))
      
      // Next steps
      console.log()
      console.log('Next steps:')
      console.log(colors.gray(`  1. Edit ${CONFIG_FILE_NAME} to customize your configuration`))
      console.log(colors.gray(`  2. Run '{{name}} validate' to check your files`))
      
    } catch (error) {
      spin.fail('Failed to create config file')
      console.error(colors.red(String(error)))
      process.exit(1)
    }
  }
})

function getConfigTemplate(template: 'minimal' | 'default' | 'full'): string {
  const templates = {
    minimal: `export default ${JSON.stringify(DEFAULT_CONFIG, null, 2)}`,
    
    default: `export default {
  // Validation rules
  rules: {
    // Add your validation rules here
    noConsoleLog: true,
    requireFileHeader: false,
  },
  
  // Server configuration
  server: {
    port: 3000,
    host: 'localhost',
    open: true,
  },
  
  // File patterns
  include: ['src/**/*.{js,ts}'],
  exclude: ['node_modules', 'dist', 'test'],
}`,
    
    full: `import { defineConfig } from '{{name}}'

export default defineConfig({
  // Validation rules
  rules: {
    // Code style rules
    noConsoleLog: true,
    noDebugger: true,
    requireFileHeader: true,
    maxLineLength: 100,
    
    // Import rules
    noUnusedImports: true,
    sortImports: true,
    
    // Function rules
    maxFunctionLength: 50,
    maxComplexity: 10,
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    open: !process.env.CI,
    cors: true,
  },
  
  // File patterns
  include: [
    'src/**/*.{js,ts,jsx,tsx}',
    'scripts/**/*.{js,ts}',
  ],
  exclude: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '**/*.test.{js,ts}',
    '**/*.spec.{js,ts}',
  ],
  
  // Caching
  cache: {
    enabled: true,
    directory: '.cache',
  },
  
  // Hooks
  hooks: {
    beforeValidate: async (files) => {
      console.log(\`Validating \${files.length} files...\`)
    },
    afterValidate: async (results) => {
      console.log(\`Found \${results.errors} errors and \${results.warnings} warnings\`)
    },
  },
})`
  }
  
  return templates[template]
}