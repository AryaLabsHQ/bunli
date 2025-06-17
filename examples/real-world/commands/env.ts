import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'env',
  description: 'Manage environment variables and configs',
  options: {
    list: option(
      z.coerce.boolean().default(false),
      { short: 'l', description: 'List all environment variables' }
    ),
    
    set: option(
      z.string().optional(),
      { short: 's', description: 'Set variable (KEY=VALUE format)' }
    ),
    
    get: option(
      z.string().optional(),
      { short: 'g', description: 'Get value of specific variable' }
    ),
    
    file: option(
      z.string().default('.env'),
      { short: 'f', description: 'Environment file to use' }
    ),
    
    check: option(
      z.coerce.boolean().default(false),
      { short: 'c', description: 'Check for missing required variables' }
    ),
    
    export: option(
      z.coerce.boolean().default(false),
      { short: 'e', description: 'Export as shell commands' }
    ),
    
    template: option(
      z.coerce.boolean().default(false),
      { short: 't', description: 'Generate .env.example template' }
    )
  },
  
  handler: async ({ flags, shell, colors, prompt }) => {
    const envFile = flags.file
    
    // Helper to parse .env file
    const parseEnvFile = async (file: string): Promise<Record<string, string>> => {
      try {
        const content = await shell`cat ${file}`.text()
        const env: Record<string, string> = {}
        
        content.split('\n').forEach(line => {
          line = line.trim()
          if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=')
            if (key) {
              env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
            }
          }
        })
        
        return env
      } catch {
        return {}
      }
    }
    
    // List environment variables
    if (flags.list) {
      const env = await parseEnvFile(envFile)
      
      if (Object.keys(env).length === 0) {
        console.log(colors.yellow(`No environment variables found in ${envFile}`))
        return
      }
      
      console.log(colors.bold(`Environment variables from ${envFile}:\n`))
      
      // Group by prefix
      const grouped: Record<string, Array<[string, string]>> = {}
      
      Object.entries(env).forEach(([key, value]) => {
        const prefix = key.split('_')[0] || 'OTHER'
        if (!grouped[prefix]) grouped[prefix] = []
        grouped[prefix].push([key, value])
      })
      
      Object.entries(grouped).forEach(([prefix, vars]) => {
        console.log(colors.cyan(`${prefix}:`))
        vars.forEach(([key, value]) => {
          // Mask sensitive values
          const displayValue = key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')
            ? colors.dim('***masked***')
            : colors.green(value)
          
          console.log(`  ${key}=${displayValue}`)
        })
        console.log()
      })
      
      return
    }
    
    // Get specific variable
    if (flags.get) {
      const env = await parseEnvFile(envFile)
      const value = env[flags.get]
      
      if (value) {
        console.log(value)
      } else {
        console.error(colors.red(`Variable '${flags.get}' not found`))
        process.exit(1)
      }
      return
    }
    
    // Set variable
    if (flags.set) {
      const match = flags.set.match(/^([^=]+)=(.*)$/)
      if (!match) {
        console.error(colors.red('Invalid format. Use KEY=VALUE'))
        process.exit(1)
      }
      
      const [, key, value] = match
      const env = await parseEnvFile(envFile)
      
      // Confirm if overwriting
      if (env[key]) {
        const confirm = await prompt.confirm(
          `Variable '${key}' already exists. Overwrite?`,
          { default: false }
        )
        if (!confirm) {
          console.log(colors.red('Cancelled'))
          return
        }
      }
      
      env[key] = value
      
      // Write back to file
      const content = Object.entries(env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')
      
      await shell`echo ${content} > ${envFile}`
      console.log(colors.green(`✓ Set ${key}=${value}`))
      return
    }
    
    // Check for required variables
    if (flags.check) {
      console.log(colors.bold('Checking required environment variables...\n'))
      
      // Common required variables (simulated)
      const required = [
        'NODE_ENV',
        'DATABASE_URL',
        'API_KEY',
        'JWT_SECRET',
        'PORT'
      ]
      
      const env = await parseEnvFile(envFile)
      const missing: string[] = []
      
      required.forEach(key => {
        if (env[key]) {
          console.log(colors.green(`✓ ${key}`))
        } else {
          console.log(colors.red(`✗ ${key} (missing)`))
          missing.push(key)
        }
      })
      
      if (missing.length > 0) {
        console.log(colors.red(`\n${missing.length} required variables missing`))
        process.exit(1)
      } else {
        console.log(colors.green('\n✓ All required variables present'))
      }
      return
    }
    
    // Export as shell commands
    if (flags.export) {
      const env = await parseEnvFile(envFile)
      
      Object.entries(env).forEach(([key, value]) => {
        // Properly escape values for shell
        const escaped = value.replace(/'/g, "'\"'\"'")
        console.log(`export ${key}='${escaped}'`)
      })
      return
    }
    
    // Generate template
    if (flags.template) {
      const env = await parseEnvFile(envFile)
      const templateFile = '.env.example'
      
      const template = Object.entries(env)
        .map(([key, value]) => {
          // Add comments and remove actual values
          const comment = key.includes('URL') ? '# Database connection URL' :
                         key.includes('KEY') ? '# API key for external service' :
                         key.includes('SECRET') ? '# Secret key - generate with openssl' :
                         key.includes('PORT') ? '# Server port' :
                         ''
          
          const exampleValue = key.includes('PORT') ? '3000' :
                              key.includes('URL') ? 'postgresql://user:pass@localhost/db' :
                              ''
          
          return comment ? `${comment}\n${key}=${exampleValue}` : `${key}=${exampleValue}`
        })
        .join('\n\n')
      
      await shell`echo ${template} > ${templateFile}`
      console.log(colors.green(`✓ Generated ${templateFile}`))
      return
    }
    
    // Default: show summary
    const env = await parseEnvFile(envFile)
    const count = Object.keys(env).length
    
    console.log(colors.bold('Environment Summary:'))
    console.log(`File: ${colors.cyan(envFile)}`)
    console.log(`Variables: ${colors.yellow(count.toString())}`)
    
    if (count > 0) {
      console.log(colors.dim(`\nUse --list to see all variables`))
    } else {
      console.log(colors.yellow('\nNo environment variables found'))
      console.log(colors.dim(`Create ${envFile} or use --set to add variables`))
    }
  }
})