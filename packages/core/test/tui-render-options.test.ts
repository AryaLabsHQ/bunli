import { describe, test, expect, afterEach } from 'bun:test'
import { createCLI } from '../src/cli.js'
import { registerTuiRenderer, clearTuiRenderer } from '../src/tui/registry.js'
import { PromptCancelledError } from '@bunli/tui/prompt'

describe('TUI renderer option plumbing', () => {
  afterEach(() => {
    clearTuiRenderer()
    process.exitCode = undefined
  })

  test('core forwards rendererOptions (including bufferMode default) to the registered renderer', async () => {
    let captured: any = null

    registerTuiRenderer(async (args) => {
      captured = args
    })

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: [],
    })

    cli.command({
      name: 'ui',
      description: 'ui',
      render: () => null,
    })

    await cli.run(['ui', '--tui'])

    expect(captured).toBeTruthy()
    expect(captured.rendererOptions).toBeTruthy()
    // In unit tests stdout is often non-TTY; default should be 'standard' in that case.
    expect(captured.rendererOptions.bufferMode).toBe('standard')
  })

  test('config tui.renderer.bufferMode is forwarded', async () => {
    let captured: any = null

    registerTuiRenderer(async (args) => {
      captured = args
    })

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: [],
      tui: {
        renderer: {
          bufferMode: 'alternate',
        },
      },
    })

    cli.command({
      name: 'ui',
      description: 'ui',
      render: () => null,
    })

    await cli.run(['ui', '--tui'])

    expect(captured?.rendererOptions?.bufferMode).toBe('alternate')
  })

  test('command-level tui.renderer overrides global config', async () => {
    let captured: any = null

    registerTuiRenderer(async (args) => {
      captured = args
    })

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: [],
      tui: {
        renderer: {
          bufferMode: 'alternate'
        }
      }
    })

    cli.command({
      name: 'ui',
      description: 'ui',
      tui: {
        renderer: {
          bufferMode: 'standard'
        }
      },
      render: () => null
    })

    await cli.run(['ui', '--tui'])

    expect(captured?.rendererOptions?.bufferMode).toBe('standard')
  })

  test('--no-tui takes precedence over --tui and --interactive', async () => {
    let renderCalled = false
    let handlerCalled = false

    registerTuiRenderer(async () => {
      renderCalled = true
    })

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: []
    })

    cli.command({
      name: 'ui',
      description: 'ui',
      handler: async () => {
        handlerCalled = true
      },
      render: () => null
    })

    await cli.run(['ui', '--tui', '--interactive', '--no-tui'])

    expect(renderCalled).toBe(false)
    expect(handlerCalled).toBe(true)
  })

  test('--no-tui still allows explicitly standard-buffer render commands', async () => {
    let renderCalled = false

    registerTuiRenderer(async () => {
      renderCalled = true
    })

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: []
    })

    cli.command({
      name: 'inline-ui',
      description: 'inline-ui',
      tui: {
        renderer: {
          bufferMode: 'standard'
        }
      },
      render: () => null
    })

    await cli.run(['inline-ui', '--no-tui'])

    expect(renderCalled).toBe(true)
  })

  test('handler PromptCancelledError exits gracefully and reports exitCode 0 to plugins', async () => {
    const exitCodes: number[] = []

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: [
        {
          name: 'capture-exit-code',
          afterCommand(context) {
            exitCodes.push(context.exitCode ?? -1)
          }
        }
      ]
    })

    cli.command({
      name: 'cancel-handler',
      description: 'cancel-handler',
      handler: async () => {
        throw new PromptCancelledError('Cancelled')
      }
    })

    await cli.run(['cancel-handler'])

    expect(exitCodes).toEqual([0])
  })

  test('render PromptCancelledError exits gracefully and reports exitCode 0 to plugins', async () => {
    const exitCodes: number[] = []

    registerTuiRenderer(async () => {
      throw new PromptCancelledError('Cancelled')
    })

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: [
        {
          name: 'capture-exit-code',
          afterCommand(context) {
            exitCodes.push(context.exitCode ?? -1)
          }
        }
      ]
    })

    cli.command({
      name: 'cancel-render',
      description: 'cancel-render',
      render: () => null
    })

    await cli.run(['cancel-render', '--tui'])

    expect(exitCodes).toEqual([0])
  })
})
