import { describe, expect, test } from 'bun:test'
import type { RenderArgs } from '@bunli/core'
import { __rendererInternalsForTests } from '../src/renderer.js'

type StubRenderer = {
  once: (event: string, cb: () => void) => void
  destroy: () => void
  emitDestroy: () => void
  destroyCalls: number
}

function createStubRenderer(): StubRenderer {
  let onDestroy: (() => void) | null = null

  return {
    destroyCalls: 0,
    once(event, cb) {
      if (event === 'destroy') {
        onDestroy = cb
      }
    },
    destroy() {
      this.destroyCalls += 1
    },
    emitDestroy() {
      onDestroy?.()
    }
  }
}

function createRenderArgs(render: ((args: RenderArgs<any, any>) => unknown) | undefined, bufferMode: 'standard' | 'alternate') {
  return {
    command: {
      render
    },
    rendererOptions: {
      bufferMode
    }
  } as RenderArgs<any, any>
}

describe('@bunli/tui renderer lifecycle', () => {
  test('forwards standard/alternate buffer mode to create renderer options', async () => {
    const captured: Array<Record<string, unknown>> = []
    const registered: Array<(args: RenderArgs<any, any>) => Promise<void>> = []
    const renderer = createStubRenderer()

    __rendererInternalsForTests.registerTuiRendererWithDependencies({
      registerRenderer(handler) {
        registered.push(handler)
      },
      createRenderer: (async (options) => {
        captured.push(options as Record<string, unknown>)
        return renderer as never
      }) as never,
      createReactRoot: (() => ({
        render() {
          renderer.emitDestroy()
        },
        unmount() {}
      })) as never,
      destroyEvent: 'destroy'
    })

    const handler = registered[0]
    expect(handler).toBeDefined()

    await handler?.(createRenderArgs(() => ({}) as object, 'standard'))
    await handler?.(createRenderArgs(() => ({}) as object, 'alternate'))

    expect(captured[0]?.useAlternateScreen).toBe(false)
    expect(captured[1]?.useAlternateScreen).toBe(true)
  })

  test('waits for destroy event then runs renderer.destroy cleanup', async () => {
    const registered: Array<(args: RenderArgs<any, any>) => Promise<void>> = []
    const renderer = createStubRenderer()

    __rendererInternalsForTests.registerTuiRendererWithDependencies({
      registerRenderer(handler) {
        registered.push(handler)
      },
      createRenderer: (async () => renderer as never) as never,
      createReactRoot: (() => ({
        render() {},
        unmount() {}
      })) as never,
      destroyEvent: 'destroy'
    })

    const handler = registered[0]
    expect(handler).toBeDefined()

    let finished = false
    const run = handler?.(createRenderArgs(() => ({}) as object, 'alternate')).then(() => {
      finished = true
    })

    await Promise.resolve()
    expect(finished).toBe(false)

    renderer.emitDestroy()
    await run

    expect(finished).toBe(true)
    expect(renderer.destroyCalls).toBe(1)
  })

  test('destroys renderer when React render throws', async () => {
    const registered: Array<(args: RenderArgs<any, any>) => Promise<void>> = []
    const renderer = createStubRenderer()

    __rendererInternalsForTests.registerTuiRendererWithDependencies({
      registerRenderer(handler) {
        registered.push(handler)
      },
      createRenderer: (async () => renderer as never) as never,
      createReactRoot: (() => ({
        render() {
          throw new Error('render failed')
        },
        unmount() {}
      })) as never,
      destroyEvent: 'destroy'
    })

    const handler = registered[0]
    expect(handler).toBeDefined()

    await expect(handler?.(createRenderArgs(() => ({}) as object, 'standard'))).rejects.toThrow('render failed')
    expect(renderer.destroyCalls).toBe(1)
  })

  test('throws for missing render component and does not create renderer', async () => {
    const registered: Array<(args: RenderArgs<any, any>) => Promise<void>> = []
    let createRendererCalls = 0

    __rendererInternalsForTests.registerTuiRendererWithDependencies({
      registerRenderer(handler) {
        registered.push(handler)
      },
      createRenderer: (async () => {
        createRendererCalls += 1
        return createStubRenderer() as never
      }) as never,
      createReactRoot: (() => ({
        render() {},
        unmount() {}
      })) as never,
      destroyEvent: 'destroy'
    })

    const handler = registered[0]
    expect(handler).toBeDefined()

    await expect(handler?.(createRenderArgs(() => null, 'alternate'))).rejects.toThrow(
      'TUI render result is missing'
    )

    expect(createRendererCalls).toBe(0)
  })
})
