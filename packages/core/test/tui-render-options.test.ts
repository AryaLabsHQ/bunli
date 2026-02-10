import { describe, test, expect, afterEach } from 'bun:test'
import { createCLI } from '../src/cli.js'
import { registerTuiRenderer, clearTuiRenderer } from '../src/tui/registry.js'

describe('TUI renderer option plumbing', () => {
  afterEach(() => {
    clearTuiRenderer()
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
})

