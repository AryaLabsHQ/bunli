#!/usr/bin/env bun

import { createCLI, defineCommand, type CLI } from '@bunli/core'
import { createPlugin, type BunliPlugin } from '@bunli/core/plugin'
import { configMergerPlugin } from '@bunli/plugin-config'
import { aiAgentPlugin, type AIDetectStore } from '@bunli/plugin-ai-detect'

interface TimingStore {
  startTime: number | null
  duration: number | null
}

// Custom plugin that adds timing information
const timingPlugin = createPlugin<TimingStore>({
  name: 'timing-plugin',
  
  // Define the store shape inline
  store: {
    startTime: null,
    duration: null
  },
  
  beforeCommand(context) {
    const startTime = Date.now()
    // Using type-safe store access methods
    context.setStoreValue('startTime', startTime)
    console.log(`⏱️  Command started at ${new Date(startTime).toLocaleTimeString()}`)
  },
  
  afterCommand(context) {
    // TypeScript knows startTime is number | null
    const startTime = context.getStoreValue('startTime')
    if (startTime) {
      const duration = Date.now() - startTime
      context.setStoreValue('duration', duration)
      console.log(`⏱️  Command completed in ${duration}ms`)
    }
  }
})

// Create CLI with plugins - types flow through!
const cli = await createCLI({
  name: 'plugin-example',
  version: '1.0.0',
  description: 'Example CLI demonstrating the plugin system',
  // generated is automatically enabled
  
  plugins: [
    // Load config from multiple sources
    configMergerPlugin({
      sources: [
        '~/.config/{{name}}/config.json',
        '.{{name}}rc.json'
      ]
    }),
    
    // Detect AI agents
    aiAgentPlugin({ verbose: true }),
    
    // Custom timing plugin
    timingPlugin
  ] as const satisfies readonly BunliPlugin[]
})

// Add a command that uses plugin context
cli.command(defineCommand({
  name: 'info',
  description: 'Show environment information',
  
  handler: async ({ context, colors }) => {
    console.log(colors.bold('Environment Information:'))
    console.log('------------------------')
    
    // Check if running in AI agent - using type-safe store
    if (context?.env.isAIAgent) {
      // TypeScript knows these types from module augmentation!
      const aiAgents = context.store.aiAgents
      const envVars = context.store.aiAgentEnvVars
      
      if (aiAgents && aiAgents.length > 0) {
        if (aiAgents.length === 1) {
          console.log(colors.green(`✓ AI Agent detected: ${aiAgents[0]}`))
        } else {
          console.log(colors.green(`✓ Multiple AI Agents detected: ${aiAgents.join(', ')}`))
        }
        
        if (envVars && envVars.length > 0) {
          console.log(`  Environment variables: ${envVars.join(', ')}`)
        }
      }
    } else {
      console.log(colors.dim('✗ No AI agent detected'))
    }
    
    // Show timing info - type-safe access
    if (context?.store.startTime) {
      console.log(`\nCommand started: ${new Date(context.store.startTime).toISOString()}`)
    }
  }
}))

// Command that demonstrates config loading
cli.command(defineCommand({
  name: 'config',
  description: 'Show loaded configuration',
  
  handler: async ({ context, colors }) => {
    console.log(colors.bold('Type-Safe Context Store:'))
    console.log('------------------------')
    
    if (context) {
      // With the new type-safe store, developers get:
      // 1. Auto-completion for available properties
      // 2. Type inference without manual annotations
      // 3. Compile-time checking
      
      console.log('Available context data:')
      
      // TypeScript knows all these types!
      if (context.store.isAIAgent !== undefined) {
        console.log(`  • AI Agent Detected: ${context.store.isAIAgent}`)
      }
      
      if (context.store.aiAgents) {
        console.log(`  • AI Agents: ${context.store.aiAgents.join(', ')}`)
      }
      
      if (context.store.startTime) {
        console.log(`  • Start Time: ${new Date(context.store.startTime).toLocaleTimeString()}`)
      }
      
      // The old way (deprecated):
      // const data = context.get<SomeType>('key')  // Manual type annotation
      
      // The new way:
      // const data = context.store.key  // Automatic type inference!
    }
  }
}))

// Run the CLI
await cli.run()