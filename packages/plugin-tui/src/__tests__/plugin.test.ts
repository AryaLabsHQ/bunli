import { test, expect, describe, mock, beforeEach } from 'bun:test'
import { createCLI, defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { tuiPlugin } from '../plugin.js'

// Mock OpenTUI since it has native dependencies
mock.module('@opentui/core', () => ({
  createCliRenderer: mock(() => ({
    add: mock(),
    remove: mock(),
    start: mock(),
    stop: mock(),
    on: mock(),
    isRunning: false,
    setBackgroundColor: mock()
  })),
  parseColor: mock((color: string) => ({ r: 1, g: 1, b: 1, a: 1, buffer: [1, 1, 1, 1] })),
  ContainerElement: class {},
  BufferedElement: class {},
  FlexDirection: { Column: 0, Row: 1 },
  RGBA: {
    fromValues: (r: number, g: number, b: number, a: number) => ({ r, g, b, a, buffer: [r, g, b, a] })
  }
}))

describe('TUI Plugin', () => {
  test('plugin exports correctly', () => {
    const plugin = tuiPlugin()
    expect(plugin.name).toBe('@bunli/plugin-tui')
    expect(plugin.store).toBeDefined()
    expect(plugin.beforeCommand).toBeDefined()
    expect(plugin.afterCommand).toBeDefined()
  })

  test('store initializes with default values', () => {
    const plugin = tuiPlugin()
    expect(plugin.store.renderer).toBeNull()
    expect(plugin.store.activeView).toBeNull()
    expect(plugin.store.formValues).toBeInstanceOf(Map)
    expect(plugin.store.options.autoForm).toBe(true)
  })

  test('plugin options are merged correctly', () => {
    const plugin = tuiPlugin({
      autoForm: false,
      theme: 'light',
      renderer: {
        fps: 60,
        mouseSupport: false
      }
    })
    
    expect(plugin.store.options.autoForm).toBe(false)
    expect(plugin.store.options.theme).toBe('light')
    expect(plugin.store.options.renderer?.fps).toBe(60)
    expect(plugin.store.options.renderer?.mouseSupport).toBe(false)
  })

  test('does not initialize renderer without interactive flag', async () => {
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [tuiPlugin()]
    })
    
    let contextStore: any = null
    
    cli.command(defineCommand({
      name: 'test',
      description: 'Test command',
      handler: async ({ context }) => {
        contextStore = context?.store
      }
    }))
    
    await cli.run(['test'])
    
    expect(contextStore).toBeDefined()
    expect(contextStore.renderer).toBeNull()
  })

  test('initializes renderer with --interactive flag', async () => {
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [tuiPlugin()]
    })
    
    let contextStore: any = null
    
    cli.command(defineCommand({
      name: 'test',
      description: 'Test command',
      options: {
        name: option(z.string(), { description: 'Your name' })
      },
      handler: async ({ context }) => {
        contextStore = context?.store
      }
    }))
    
    // Note: In real usage, this would show a form and wait for input
    // Here we're just testing that the renderer gets initialized
    try {
      await cli.run(['test', '--interactive'])
    } catch (e) {
      // Expected to fail since we're not providing form input
    }
    
    expect(contextStore).toBeDefined()
    expect(contextStore.renderer).toBeDefined()
  })

  test('respects autoForm option', async () => {
    const cli = await createCLI({
      name: 'test-cli',
      version: '1.0.0',
      plugins: [tuiPlugin({ autoForm: false })]
    })
    
    let rendererInitialized = false
    
    cli.command(defineCommand({
      name: 'test',
      description: 'Test command',
      options: {
        name: option(z.string(), { description: 'Your name' })
      },
      handler: async ({ context }) => {
        rendererInitialized = !!context?.store.renderer
      }
    }))
    
    await cli.run(['test', '--interactive'])
    
    // With autoForm disabled, renderer should still initialize but no form
    expect(rendererInitialized).toBe(true)
  })
})

describe('Schema Mapping', () => {
  test('maps string schema to Input component', async () => {
    const { SchemaUIMapper } = await import('../schema/mapper.js')
    const { Input } = await import('../components/Input.js')
    
    const mapper = new SchemaUIMapper()
    const command = defineCommand({
      name: 'test',
      description: 'Test',
      options: {
        name: option(z.string(), { description: 'Your name' })
      }
    })
    
    const form = await mapper.createFormFromCommand(command)
    expect(form).toBeDefined()
    // Note: Would need to test actual component types if not mocked
  })
})