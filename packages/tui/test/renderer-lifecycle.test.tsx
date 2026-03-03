import { describe, expect, test } from 'bun:test'
import { __rendererInternalsForTests } from '../src/renderer.js'

type RenderArgsLike = {
  command: {
    render?: (args: RenderArgsLike) => unknown
  }
  rendererOptions?: {
    bufferMode?: 'standard' | 'alternate'
  }
  [key: string]: unknown
}

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

function createRenderArgs(
  render: ((args: RenderArgsLike) => unknown) | undefined,
  bufferMode: 'standard' | 'alternate'
): RenderArgsLike {
  return {
    command: {
      render
    },
    rendererOptions: {
      bufferMode
    }
  }
}

describe('@bunli/tui renderer lifecycle', () => {
  test('forwards standard/alternate buffer mode to create renderer options', async () => {
    const captured: Array<Record<string, unknown>> = []
    const renderer = createStubRenderer()

    await __rendererInternalsForTests.runTuiRenderWithDependencies(
      createRenderArgs(() => ({}) as object, 'standard'),
      {
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
      }
    )

    await __rendererInternalsForTests.runTuiRenderWithDependencies(
      createRenderArgs(() => ({}) as object, 'alternate'),
      {
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
      }
    )

    expect(captured[0]?.useAlternateScreen).toBe(false)
    expect(captured[1]?.useAlternateScreen).toBe(true)
  })

  test('waits for destroy event then runs renderer.destroy cleanup', async () => {
    const renderer = createStubRenderer()

    let finished = false
    const run = __rendererInternalsForTests.runTuiRenderWithDependencies(
      createRenderArgs(() => ({}) as object, 'alternate'),
      {
        createRenderer: (async () => renderer as never) as never,
        createReactRoot: (() => ({
          render() {},
          unmount() {}
        })) as never,
        destroyEvent: 'destroy'
      }
    ).then(() => {
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
    const renderer = createStubRenderer()

    await expect(
      __rendererInternalsForTests.runTuiRenderWithDependencies(
        createRenderArgs(() => ({}) as object, 'standard'),
        {
          createRenderer: (async () => renderer as never) as never,
          createReactRoot: (() => ({
            render() {
              throw new Error('render failed')
            },
            unmount() {}
          })) as never,
          destroyEvent: 'destroy'
        }
      )
    ).rejects.toThrow('render failed')

    expect(renderer.destroyCalls).toBe(1)
  })

  test('throws for missing render component and does not create renderer', async () => {
    let createRendererCalls = 0

    await expect(
      __rendererInternalsForTests.runTuiRenderWithDependencies(
        createRenderArgs(() => null, 'alternate'),
        {
          createRenderer: (async () => {
            createRendererCalls += 1
            return createStubRenderer() as never
          }) as never,
          createReactRoot: (() => ({
            render() {},
            unmount() {}
          })) as never,
          destroyEvent: 'destroy'
        }
      )
    ).rejects.toThrow('TUI render result is missing')

    expect(createRendererCalls).toBe(0)
  })
})
