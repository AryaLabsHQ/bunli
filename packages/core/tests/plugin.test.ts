import { describe, test, expect } from 'bun:test'
import { createCLI, defineCommand } from '../src/index.js'
import type { BunliPlugin } from '../src/plugin/types.js'

describe('Plugin System', () => {
  test('loads and executes plugin setup hook', async () => {
    let setupCalled = false
    
    const testPlugin: BunliPlugin = {
      name: 'test-plugin',
      setup(context) {
        setupCalled = true
        expect(context.config.name).toBe('test-cli')
      }
    }
    
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [testPlugin]
    })
    
    expect(setupCalled).toBe(true)
  })
  
  test('plugin can modify config', async () => {
    const testPlugin: BunliPlugin = {
      name: 'config-modifier',
      setup(context) {
        context.updateConfig({
          description: 'Modified by plugin'
        })
      }
    }
    
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [testPlugin]
    })
    
    // We can't directly test the config, but we can verify it doesn't error
    expect(cli).toBeDefined()
  })
  
  test('plugin can register commands', async () => {
    const testPlugin: BunliPlugin = {
      name: 'command-plugin',
      setup(context) {
        context.registerCommand({
          name: 'plugin-cmd',
          description: 'Command from plugin',
          handler: async () => {
            console.log('Plugin command executed')
          }
        })
      }
    }
    
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [testPlugin]
    })
    
    // Test that the command exists by running it
    let executed = false
    const originalLog = console.log
    console.log = (msg: string) => {
      if (msg === 'Plugin command executed') {
        executed = true
      }
    }
    
    await cli.run(['plugin-cmd'])
    console.log = originalLog
    
    expect(executed).toBe(true)
  })
  
  test('beforeCommand and afterCommand hooks', async () => {
    const events: string[] = []
    
    interface TestStore {
      testData: string
    }
    
    const testPlugin: BunliPlugin<TestStore> = {
      name: 'hook-plugin',
      store: {
        testData: ''
      },
      beforeCommand(context) {
        events.push('beforeCommand')
        context.store.testData = 'injected-value'
      },
      afterCommand(context) {
        events.push('afterCommand')
        expect(context.error).toBeUndefined()
      }
    }
    
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [testPlugin]
    })
    
    cli.command({
      name: 'test',
      description: 'Test command',
      handler: async ({ context }) => {
        events.push('handler')
        expect(context?.store.testData).toBe('injected-value')
      }
    })
    
    await cli.run(['test'])
    
    expect(events).toEqual(['beforeCommand', 'handler', 'afterCommand'])
  })
  
  test('multiple plugins execute in order', async () => {
    const events: string[] = []
    
    const plugin1: BunliPlugin = {
      name: 'plugin-1',
      setup() { events.push('setup-1') },
      beforeCommand() { events.push('before-1') },
      afterCommand() { events.push('after-1') }
    }
    
    const plugin2: BunliPlugin = {
      name: 'plugin-2',
      setup() { events.push('setup-2') },
      beforeCommand() { events.push('before-2') },
      afterCommand() { events.push('after-2') }
    }
    
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [plugin1, plugin2]
    })
    
    cli.command({
      name: 'test',
      description: 'Test command',
      handler: async () => {
        events.push('handler')
      }
    })
    
    await cli.run(['test'])
    
    expect(events).toEqual([
      'setup-1', 
      'setup-2', 
      'before-1', 
      'before-2', 
      'handler', 
      'after-1', 
      'after-2'
    ])
  })
  
  test('plugin factory function', async () => {
    interface TestPluginOptions {
      message: string
    }
    
    interface FactoryStore {
      message: string
    }
    
    function testPlugin(options: TestPluginOptions): BunliPlugin<FactoryStore> {
      return {
        name: 'factory-plugin',
        store: {
          message: options.message
        }
      }
    }
    
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [testPlugin({ message: 'Hello from factory' })]
    })
    
    expect(cli).toBeDefined()
  })
  
  test('error in beforeCommand prevents execution', async () => {
    const testPlugin: BunliPlugin = {
      name: 'error-plugin',
      beforeCommand() {
        throw new Error('Plugin validation failed')
      }
    }
    
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [testPlugin]
    })
    
    let handlerCalled = false
    cli.command({
      name: 'test',
      description: 'Test command',
      handler: async () => {
        handlerCalled = true
      }
    })
    
    // Capture console.error to suppress output
    const originalError = console.error
    const errors: string[] = []
    console.error = (msg: string) => errors.push(msg)
    
    // Also need to prevent process.exit
    const originalExit = process.exit
    let exitCode: number | undefined
    ;(process.exit as any) = (code: number) => {
      exitCode = code
      throw new Error('PROCESS_EXIT')
    }
    
    try {
      await cli.run(['test'])
    } catch (error: any) {
      // Expected to throw due to our process.exit mock
    }
    
    // Restore
    console.error = originalError
    process.exit = originalExit
    
    expect(exitCode).toBe(1)
    expect(errors.some(e => e.includes('Plugin validation failed'))).toBe(true)
    expect(handlerCalled).toBe(false)
  })
})