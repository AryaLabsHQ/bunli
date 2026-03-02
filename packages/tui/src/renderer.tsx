import { createCliRenderer } from '@opentui/core'
import { CliRenderEvents } from '@opentui/core'
import { createRoot } from '@opentui/react'
import type { ReactElement } from 'react'
import { resolveOpenTuiRendererOptions, type TuiRenderOptions } from './options.js'
import { AppRuntimeProvider } from './runtime/app-runtime.js'

export interface RunTuiRenderArgs {
  command: {
    // Bunli core passes a richer RenderArgs shape; keep this contract permissive.
    render?: (args: any) => unknown
  }
  rendererOptions?: TuiRenderOptions
}

interface RendererDependencies {
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

async function runTuiRenderWithDependencies(
  args: RunTuiRenderArgs,
  deps: RendererDependencies
): Promise<void> {
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
}

export async function runTuiRender(args: RunTuiRenderArgs): Promise<void> {
  await runTuiRenderWithDependencies(args, {
    createRenderer: createCliRenderer,
    createReactRoot: createRoot,
    destroyEvent: CliRenderEvents.DESTROY
  })
}

export const __rendererInternalsForTests = {
  runTuiRenderWithDependencies
}
