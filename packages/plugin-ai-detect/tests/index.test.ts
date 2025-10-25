import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { aiAgentPlugin } from '../src/index.js'
import { CommandContext, createEnvironmentInfo } from '@bunli/core/plugin'

describe('AI Agent Detection Plugin', () => {
  const originalEnv = { ...process.env }
  
  beforeEach(() => {
    // Clear all environment variables
    for (const key in process.env) {
      delete process.env[key]
    }
  })
  
  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv }
  })
  
  test('detects Claude Code', () => {
    process.env.CLAUDECODE = 'true'
    
    const plugin = aiAgentPlugin()
    const initialStore = plugin.store || {}
    const context = new CommandContext('test', [], {}, createEnvironmentInfo(), initialStore)
    
    plugin.beforeCommand!(context)
    
    expect(context.env.isAIAgent).toBe(true)
    expect(context.env.aiAgents).toContain('claude')
    if (context.store) {
      expect(context.store.isAIAgent).toBe(true)
      expect(context.store.aiAgents).toContain('claude')
    }
  })
  
  test('detects Cursor', () => {
    process.env.CURSOR_AGENT = '1'
    
    const plugin = aiAgentPlugin()
    const initialStore = plugin.store || {}
    const context = new CommandContext('test', [], {}, createEnvironmentInfo(), initialStore)
    
    plugin.beforeCommand!(context)
    
    expect(context.env.isAIAgent).toBe(true)
    expect(context.env.aiAgents).toContain('cursor')
  })
  
  test('detects GitHub Copilot', () => {
    process.env.GITHUB_COPILOT_ENABLED = 'true'
    
    const plugin = aiAgentPlugin({
      customAgents: [{
        name: 'github-copilot',
        envVars: ['GITHUB_COPILOT_ENABLED'],
        detect: (env) => !!env.GITHUB_COPILOT_ENABLED
      }]
    })
    const initialStore = plugin.store || {}
    const context = new CommandContext('test', [], {}, createEnvironmentInfo(), initialStore)
    
    plugin.beforeCommand!(context)
    
    expect(context.env.isAIAgent).toBe(true)
    expect(context.env.aiAgents).toContain('github-copilot')
  })
  
  test('detects custom AI agents', () => {
    process.env.MY_CUSTOM_AI = 'enabled'
    
    const plugin = aiAgentPlugin({
      customAgents: [
        {
          name: 'custom-ai',
          envVars: ['MY_CUSTOM_AI'],
          detect: (env) => env.MY_CUSTOM_AI === 'enabled'
        }
      ]
    })
    
    const initialStore = plugin.store || {}
    const context = new CommandContext('test', [], {}, createEnvironmentInfo(), initialStore)
    plugin.beforeCommand!(context)
    
    expect(context.env.isAIAgent).toBe(true)
    expect(context.env.aiAgents).toContain('custom-ai')
  })
  
  test('no AI agent detected', () => {
    const plugin = aiAgentPlugin()
    const initialStore = plugin.store || {}
    const context = new CommandContext('test', [], {}, createEnvironmentInfo(), initialStore)
    
    plugin.beforeCommand!(context)
    
    expect(context.env.isAIAgent).toBe(false)
    expect(context.env.aiAgents).toEqual([])
    if (context.store) {
      expect(context.store.isAIAgent).toBe(false)
    }
  })
  
  test('stores detected environment variables', () => {
    process.env.CURSOR_AGENT = '1'
    
    const plugin = aiAgentPlugin()
    const initialStore = plugin.store || {}
    const context = new CommandContext('test', [], {}, createEnvironmentInfo(), initialStore)
    
    plugin.beforeCommand!(context)
    
    const detectedVars = context.store?.aiAgentEnvVars
    if (detectedVars) {
      expect(detectedVars).toContain('CURSOR_AGENT')
    } else {
      // If store is not available, check env instead
      expect(context.env.isAIAgent).toBe(true)
      expect(context.env.aiAgents).toContain('cursor')
    }
  })
  
  test('verbose mode logs detection', () => {
    process.env.CLAUDECODE = 'true'
    
    const logs: string[] = []
    const originalLog = console.log
    console.log = (msg: string) => logs.push(msg)
    
    const plugin = aiAgentPlugin({ verbose: true })
    const initialStore = plugin.store || {}
    const context = new CommandContext('test', [], {}, createEnvironmentInfo(), initialStore)
    
    plugin.beforeCommand!(context)
    
    console.log = originalLog
    
    expect(logs).toContain('🤖 AI agent detected: claude')
    expect(logs.some(log => log.includes('CLAUDECODE'))).toBe(true)
  })
  
  test('detects multiple agents', () => {
    // Set multiple AI agent env vars
    process.env.CLAUDECODE = '1'
    process.env.CURSOR_AGENT = '1'

    const plugin = aiAgentPlugin()
    const initialStore = plugin.store || {}
    const context = new CommandContext('test', [], {}, createEnvironmentInfo(), initialStore)
    
    plugin.beforeCommand!(context)
    
    // Should detect both
    expect(context.env.aiAgents).toContain('claude')
    expect(context.env.aiAgents).toContain('cursor')
    expect(context.env.aiAgents.length).toBe(2)
  })
})