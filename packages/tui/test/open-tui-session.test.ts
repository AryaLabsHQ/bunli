import { describe, expect, test } from 'bun:test'
import { __openTuiSessionInternalsForTests } from '../src/prompt/runtime/open-tui-session.js'

type DestroyHandler = () => void
type KeypressHandler = (event: unknown) => void

type StubRenderer = {
  isDestroyed: boolean
  disableStdoutInterceptionCalls: number
  prependInputHandlers: Array<(sequence: string) => boolean>
  onCalls: Array<{ event: string; handler: DestroyHandler }>
  offCalls: Array<{ event: string; handler: DestroyHandler }>
  keyInput: {
    on(event: string, handler: KeypressHandler): void
    off(event: string, handler: KeypressHandler): void
  }
  currentRenderBuffer: { clear(): void }
  nextRenderBuffer: { clear(): void }
  requestRenderCalls: number
  idleCalls: number
  destroyCalls: number
  disableStdoutInterception(): void
  prependInputHandler(handler: (sequence: string) => boolean): void
  on(event: string, handler: DestroyHandler): void
  off(event: string, handler: DestroyHandler): void
  emitDestroy(): void
  requestRender(): void
  idle(): Promise<void>
  destroy(): void
}

type StubRoot = {
  renderCalls: number
  unmountCalls: number
  render(node: unknown): void
  unmount(): void
}

function createStubRoot(): StubRoot {
  return {
    renderCalls: 0,
    unmountCalls: 0,
    render() {
      this.renderCalls += 1
    },
    unmount() {
      this.unmountCalls += 1
    }
  }
}

function createStubRenderer(destroyEvent: string): StubRenderer {
  const destroyHandlers = new Set<DestroyHandler>()
  const keypressHandlers = new Set<KeypressHandler>()

  return {
    isDestroyed: false,
    disableStdoutInterceptionCalls: 0,
    prependInputHandlers: [],
    onCalls: [],
    offCalls: [],
    keyInput: {
      on(event, handler) {
        if (event === 'keypress') {
          keypressHandlers.add(handler)
        }
      },
      off(event, handler) {
        if (event === 'keypress') {
          keypressHandlers.delete(handler)
        }
      }
    },
    currentRenderBuffer: {
      clear() {}
    },
    nextRenderBuffer: {
      clear() {}
    },
    requestRenderCalls: 0,
    idleCalls: 0,
    destroyCalls: 0,
    disableStdoutInterception() {
      this.disableStdoutInterceptionCalls += 1
    },
    prependInputHandler(handler) {
      this.prependInputHandlers.push(handler)
    },
    on(event, handler) {
      this.onCalls.push({ event, handler })
      if (event === destroyEvent) {
        destroyHandlers.add(handler)
      }
    },
    off(event, handler) {
      this.offCalls.push({ event, handler })
      if (event === destroyEvent) {
        destroyHandlers.delete(handler)
      }
    },
    emitDestroy() {
      this.isDestroyed = true
      for (const handler of [...destroyHandlers]) {
        handler()
      }
    },
    requestRender() {
      this.requestRenderCalls += 1
    },
    async idle() {
      this.idleCalls += 1
    },
    destroy() {
      this.destroyCalls += 1
      this.emitDestroy()
    }
  }
}

describe('OpenTUI prompt session runtime', () => {
  test('removes renderer destroy listener after prompt settles normally', async () => {
    const destroyEvent = 'destroy'
    const renderer = createStubRenderer(destroyEvent)
    const root = createStubRoot()

    const session = __openTuiSessionInternalsForTests.createOpenTuiRendererSessionWithDependencies({
      createRenderer: (async () => renderer as never) as never,
      createReactRoot: (() => root as never) as never,
      destroyEvent
    })

    const value = await session.runPrompt<string>({
      render(resolve) {
        resolve('ready')
        return null
      }
    })

    expect(value).toBe('ready')
    expect(renderer.onCalls.length).toBe(1)
    expect(renderer.offCalls.length).toBe(1)
    expect(renderer.onCalls[0]?.handler).toBe(renderer.offCalls[0]?.handler)
    expect(root.unmountCalls).toBe(1)

    await session.dispose()
  })

  test('reinstalls raw cancel input handler after renderer recreation', async () => {
    const destroyEvent = 'destroy'
    const renderer1 = createStubRenderer(destroyEvent)
    const renderer2 = createStubRenderer(destroyEvent)
    const roots = [createStubRoot(), createStubRoot()]
    let createRendererCalls = 0

    const session = __openTuiSessionInternalsForTests.createOpenTuiRendererSessionWithDependencies({
      createRenderer: (async () => {
        createRendererCalls += 1
        if (createRendererCalls === 1) return renderer1 as never
        return renderer2 as never
      }) as never,
      createReactRoot: (() => (roots.shift() ?? createStubRoot()) as never) as never,
      destroyEvent
    })

    await session.initialize()
    expect(createRendererCalls).toBe(1)
    expect(renderer1.prependInputHandlers.length).toBe(1)

    renderer1.isDestroyed = true
    await session.initialize()

    expect(createRendererCalls).toBe(2)
    expect(renderer2.prependInputHandlers.length).toBe(1)

    await session.dispose()
  })
})
