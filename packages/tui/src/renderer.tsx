import type { RenderArgs } from '@bunli/core'
import { createCliRenderer } from '@opentui/core'
import { CliRenderEvents } from '@opentui/core'
import { createRoot } from '@opentui/react'
import type { ReactElement } from 'react'
import { resolveOpenTuiRendererOptions } from './options.js'
import { AppRuntimeProvider } from './runtime/app-runtime.js'

type RegisterRendererFn = (render: (args: RenderArgs<any, any>) => Promise<void>) => void
type TuiRenderer = (args: RenderArgs<any, any>) => Promise<unknown> | unknown

const TUI_RENDERER_SYMBOL = Symbol.for('bunli:tui:renderer')

interface TuiRendererGlobal {
  [TUI_RENDERER_SYMBOL]?: TuiRenderer
}

interface RendererDependencies {
  registerRenderer: RegisterRendererFn
  createRenderer: typeof createCliRenderer
  createReactRoot: typeof createRoot
  destroyEvent: string
}

function renderWithProviders(component: ReactElement) {
  return (
    <AppRuntimeProvider>
      {component}
    </AppRuntimeProvider>
  )
}

function registerTuiRendererWithDependencies(deps: RendererDependencies): void {
  deps.registerRenderer(async (args: RenderArgs<any, any>) => {
    const component = args.command.render?.(args)

    if (!component) {
      throw new Error('TUI render result is missing. Ensure command.render returns JSX.')
    }

    const renderer = await deps.createRenderer(resolveOpenTuiRendererOptions(args.rendererOptions))

    try {
      const done = new Promise<void>((resolve) => {
        renderer.once(deps.destroyEvent, () => resolve())
      })

      const root = deps.createReactRoot(renderer)
      root.render(renderWithProviders(component as ReactElement))

      await done
    } finally {
      renderer.destroy()
    }
  })
}

export function registerTuiRenderer(): void {
  const registerRenderer: RegisterRendererFn = (render) => {
    ;(globalThis as typeof globalThis & TuiRendererGlobal)[TUI_RENDERER_SYMBOL] = render
  }

  registerTuiRendererWithDependencies({
    registerRenderer,
    createRenderer: createCliRenderer,
    createReactRoot: createRoot,
    destroyEvent: CliRenderEvents.DESTROY
  })
}

export const __rendererInternalsForTests = {
  registerTuiRendererWithDependencies
}
