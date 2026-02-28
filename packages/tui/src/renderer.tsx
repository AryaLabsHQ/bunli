import { registerTuiRenderer as coreRegisterTuiRenderer } from '@bunli/core'
import type { RenderArgs } from '@bunli/core'
import { createCliRenderer } from '@opentui/core'
import { CliRenderEvents } from '@opentui/core'
import { createRoot } from '@opentui/react'
import type { ReactElement } from 'react'
import { DialogProvider } from './components/dialog-manager.js'
import { FocusScopeProvider } from './components/focus-scope.js'
import { OverlayHostProvider } from './components/overlay-host.js'
import { resolveOpenTuiRendererOptions } from './options.js'

type RegisterRendererFn = (render: (args: RenderArgs<any, any>) => Promise<void>) => void

interface RendererDependencies {
  registerRenderer: RegisterRendererFn
  createRenderer: typeof createCliRenderer
  createReactRoot: typeof createRoot
  destroyEvent: string
}

function renderWithProviders(component: ReactElement) {
  return (
    <FocusScopeProvider>
      <OverlayHostProvider>
        <DialogProvider>{component}</DialogProvider>
      </OverlayHostProvider>
    </FocusScopeProvider>
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
  registerTuiRendererWithDependencies({
    registerRenderer: coreRegisterTuiRenderer,
    createRenderer: createCliRenderer,
    createReactRoot: createRoot,
    destroyEvent: CliRenderEvents.DESTROY
  })
}

export const __rendererInternalsForTests = {
  registerTuiRendererWithDependencies
}
