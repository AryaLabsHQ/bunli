import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { configMergerPlugin } from '../src/index.js'
import { PluginContext } from '@bunli/core/plugin'
import { createLogger } from '@bunli/core/utils'

describe('Config Merger Plugin', () => {
  const testDir = join(process.cwd(), '.test-config')
  const homeConfigDir = join(homedir(), '.config', 'test-app')
  
  beforeEach(async () => {
    // Create test directories
    await mkdir(testDir, { recursive: true })
  })
  
  afterEach(async () => {
    // Clean up test directories
    await rm(testDir, { recursive: true, force: true })
  })
  
  test('loads config from local rc file', async () => {
    const config = { apiKey: 'test-key', port: 3000 }
    await writeFile(join(testDir, '.test-apprc'), JSON.stringify(config))
    
    const plugin = configMergerPlugin({
      sources: [join(testDir, '.test-apprc')]
    })
    
    const configUpdates: any[] = []
    const context = new PluginContext(
      { name: 'test-app' },
      new Map(),
      createLogger('test'),
      { cwd: testDir, home: homedir(), config: testDir }
    )
    
    // Override updateConfig to capture updates
    context.updateConfig = (update) => {
      configUpdates.push(update)
    }
    
    await plugin.setup!(context)
    
    expect(configUpdates).toHaveLength(1)
    expect(configUpdates[0]).toEqual(config)
  })
  
  test('merges multiple config files', async () => {
    const config1 = { apiKey: 'key1', port: 3000, debug: false }
    const config2 = { apiKey: 'key2', extra: 'value' }
    
    await writeFile(join(testDir, 'config1.json'), JSON.stringify(config1))
    await writeFile(join(testDir, 'config2.json'), JSON.stringify(config2))
    
    const plugin = configMergerPlugin({
      sources: [
        join(testDir, 'config1.json'),
        join(testDir, 'config2.json')
      ]
    })
    
    const configUpdates: any[] = []
    const context = new PluginContext(
      { name: 'test-app' },
      new Map(),
      createLogger('test'),
      { cwd: testDir, home: homedir(), config: testDir }
    )
    
    context.updateConfig = (update) => {
      configUpdates.push(update)
    }
    
    await plugin.setup!(context)
    
    expect(configUpdates).toHaveLength(1)
    // Later config should override earlier
    expect(configUpdates[0]).toEqual({
      apiKey: 'key2',
      port: 3000,
      debug: false,
      extra: 'value'
    })
  })
  
  test('replaces {{name}} template in paths', async () => {
    const config = { test: true }
    await writeFile(join(testDir, '.my-clirc'), JSON.stringify(config))
    
    const plugin = configMergerPlugin({
      sources: [join(testDir, '.{{name}}rc')]
    })
    
    const configUpdates: any[] = []
    const context = new PluginContext(
      { name: 'my-cli' },
      new Map(),
      createLogger('test'),
      { cwd: testDir, home: homedir(), config: testDir }
    )
    
    context.updateConfig = (update) => {
      configUpdates.push(update)
    }
    
    await plugin.setup!(context)
    
    expect(configUpdates).toHaveLength(1)
    expect(configUpdates[0]).toEqual(config)
  })
  
  test('handles missing config files gracefully', async () => {
    const plugin = configMergerPlugin({
      sources: [join(testDir, 'does-not-exist.json')]
    })
    
    const configUpdates: any[] = []
    const context = new PluginContext(
      { name: 'test-app' },
      new Map(),
      createLogger('test'),
      { cwd: testDir, home: homedir(), config: testDir }
    )
    
    context.updateConfig = (update) => {
      configUpdates.push(update)
    }
    
    // Should not throw
    await plugin.setup!(context)
    
    // No config updates since file doesn't exist
    expect(configUpdates).toHaveLength(0)
  })
  
  test('stopOnFirst option', async () => {
    const config1 = { source: 'first' }
    const config2 = { source: 'second' }
    
    await writeFile(join(testDir, 'first.json'), JSON.stringify(config1))
    await writeFile(join(testDir, 'second.json'), JSON.stringify(config2))
    
    const plugin = configMergerPlugin({
      sources: [
        join(testDir, 'first.json'),
        join(testDir, 'second.json')
      ],
      stopOnFirst: true
    })
    
    const configUpdates: any[] = []
    const context = new PluginContext(
      { name: 'test-app' },
      new Map(),
      createLogger('test'),
      { cwd: testDir, home: homedir(), config: testDir }
    )
    
    context.updateConfig = (update) => {
      configUpdates.push(update)
    }
    
    await plugin.setup!(context)
    
    expect(configUpdates).toHaveLength(1)
    expect(configUpdates[0]).toEqual({ source: 'first' })
  })
})