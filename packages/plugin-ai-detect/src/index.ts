/**
 * AI agent detection plugin for Bunli
 * Detects various AI coding assistants from environment variables
 */

import type { BunliPlugin } from '@bunli/core/plugin'
import { createPlugin } from '@bunli/core/plugin'

// Extend core interfaces with AI-specific fields
declare module '@bunli/core/plugin' {
  interface EnvironmentInfo {
    /** AI agent detected */
    isAIAgent: boolean
    
    /** Detected AI agents */
    aiAgents: string[]
  }
}

interface AIAgentInfo {
  name: string
  envVars: string[]
  detect: (env: NodeJS.ProcessEnv) => boolean
}

// Known AI agents and their detection patterns
const AI_AGENTS: AIAgentInfo[] = [
  {
    name: 'claude',
    envVars: ['CLAUDECODE'],
    detect: (env) => !!env.CLAUDECODE
  },
  {
    name: 'cursor',
    envVars: ['CURSOR_TRACE_ID'],
    detect: (env) => !!env.CURSOR_TRACE_ID
  },
]

export interface AIDetectPluginOptions {
  /**
   * Additional custom AI agents to detect
   */
  customAgents?: AIAgentInfo[]
  
  /**
   * Whether to log detection results
   * Default: false
   */
  verbose?: boolean
}

export interface AIDetectStore {
  isAIAgent: boolean
  aiAgents: string[]
  aiAgentEnvVars: string[]
}

/**
 * AI agent detection plugin factory
 */
export const aiAgentPlugin = createPlugin<AIDetectPluginOptions, AIDetectStore>((options = {}) => {
  const agents = [...AI_AGENTS, ...(options.customAgents || [])]
  
  return {
    name: '@bunli/plugin-ai-detect',
    version: '1.0.0',
    
    // Define initial store state
    store: {
      isAIAgent: false,
      aiAgents: [] as string[],
      aiAgentEnvVars: [] as string[]
    },
    
    beforeCommand(context) {
      const env = process.env
      const detectedAgents: string[] = []
      const allDetectedEnvVars: string[] = []
      
      // Initialize AI fields on the environment info
      context.env.isAIAgent = false
      context.env.aiAgents = []
      
      // Check all known AI agents
      for (const agent of agents) {
        if (agent.detect(env)) {
          detectedAgents.push(agent.name)
          
          // Store detected environment variables for this agent
          const detectedVars = agent.envVars.filter(v => !!env[v])
          allDetectedEnvVars.push(...detectedVars)
          
          // Log if verbose
          if (options.verbose) {
            console.log(`🤖 AI agent detected: ${agent.name}`)
            console.log(`   Environment variables: ${detectedVars.join(', ')}`)
          }
        }
      }
      
      // Update context based on detection results
      if (detectedAgents.length > 0) {
        context.env.isAIAgent = true
        context.env.aiAgents = detectedAgents
        
        // Use type-safe store - TypeScript knows the exact types!
        context.store.isAIAgent = true
        context.store.aiAgents = detectedAgents
        context.store.aiAgentEnvVars = allDetectedEnvVars
        
        if (options.verbose) {
          if (detectedAgents.length === 1) {
            console.log(`🤖 AI agent detected: ${detectedAgents[0]}`)
          } else {
            console.log(`🤖 Multiple AI agents detected: ${detectedAgents.join(', ')}`)
          }
        }
      } else {
        // Ensure fields are initialized even when no AI agent detected
        context.store.isAIAgent = false
        context.store.aiAgents = []
        context.store.aiAgentEnvVars = []
      }
    }
  }
})

// Default export for convenience
export default aiAgentPlugin