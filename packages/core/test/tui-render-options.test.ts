import { afterEach, describe, expect, test } from 'bun:test'
import { createCLI } from '../src/cli.js'
import { PromptCancelledError } from '@bunli/runtime/prompt'
import type { TerminalInfo } from '../src/types.js'

function interactiveTerminal(): TerminalInfo {
  return {
    width: 120,
    height: 40,
    isInteractive: true,
    isCI: false,
    supportsColor: true,
    supportsMouse: true
  }
}

function nonInteractiveTerminal(): TerminalInfo {
  return {
    width: 80,
    height: 24,
    isInteractive: false,
    isCI: false,
    supportsColor: false,
    supportsMouse: false
  }
}

describe('TUI renderer option plumbing', () => {
  afterEach(() => {
    process.exitCode = undefined
  })

  test('core forwards rendererOptions (including bufferMode default) to the TUI render bridge', async () => {
    let capturedBufferMode: unknown

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: []
    }, {
      getTerminalInfo: interactiveTerminal,
      runTuiRender: async (args) => {
        capturedBufferMode = (args.rendererOptions as Record<string, unknown> | undefined)?.bufferMode
      }
    })

    cli.command({
      name: 'ui',
      description: 'ui',
      render: () => null
    })

    await cli.run(['ui'])

    expect(capturedBufferMode).toBe('standard')
  })

  test('auto-wires @bunli/runtime renderer for render commands without manual registration', async () => {
    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: []
    }, {
      getTerminalInfo: interactiveTerminal
    })

    cli.command({
      name: 'ui',
      description: 'ui',
      render: () => null
    })

    await expect(cli.execute('ui')).rejects.toThrow('TUI render result is missing')
  })

  test('config tui.renderer.bufferMode is forwarded', async () => {
    let capturedBufferMode: unknown

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: [],
      tui: {
        renderer: {
          bufferMode: 'alternate'
        }
      }
    }, {
      getTerminalInfo: interactiveTerminal,
      runTuiRender: async (args) => {
        capturedBufferMode = (args.rendererOptions as Record<string, unknown> | undefined)?.bufferMode
      }
    })

    cli.command({
      name: 'ui',
      description: 'ui',
      render: () => null
    })

    await cli.run(['ui'])

    expect(capturedBufferMode).toBe('alternate')
  })

  test('command-level tui.renderer overrides global config', async () => {
    let capturedBufferMode: unknown

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: [],
      tui: {
        renderer: {
          bufferMode: 'alternate'
        }
      }
    }, {
      getTerminalInfo: interactiveTerminal,
      runTuiRender: async (args) => {
        capturedBufferMode = (args.rendererOptions as Record<string, unknown> | undefined)?.bufferMode
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

    await cli.run(['ui'])

    expect(capturedBufferMode).toBe('standard')
  })

  test('non-interactive terminals fall back to handler when present', async () => {
    let renderCalled = false
    let handlerCalled = false

    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: []
    }, {
      getTerminalInfo: nonInteractiveTerminal,
      runTuiRender: async () => {
        renderCalled = true
      }
    })

    cli.command({
      name: 'ui',
      description: 'ui',
      handler: async () => {
        handlerCalled = true
      },
      render: () => null
    })

    await cli.run(['ui'])

    expect(renderCalled).toBe(false)
    expect(handlerCalled).toBe(true)
  })

  test('render-only commands error on non-interactive terminals', async () => {
    const cli = await createCLI({
      name: 'test-cli',
      version: '0.0.0',
      plugins: []
    }, {
      getTerminalInfo: nonInteractiveTerminal
    })

    cli.command({
      name: 'inline-ui',
      description: 'inline-ui',
      render: () => null,
    })

    await expect(cli.execute('inline-ui')).rejects.toThrow('Command does not provide a handler for non-TUI execution')
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
    }, {
      getTerminalInfo: interactiveTerminal,
      runTuiRender: async () => {
        throw new PromptCancelledError('Cancelled')
      }
    })

    cli.command({
      name: 'cancel-render',
      description: 'cancel-render',
      render: () => null
    })

    await cli.run(['cancel-render'])

    expect(exitCodes).toEqual([0])
  })
})
