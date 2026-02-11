import { registerTuiRenderer as coreRegisterTuiRenderer } from '@bunli/core'
import type { RenderArgs } from '@bunli/core'
import { createCliRenderer } from '@opentui/core'
import { CliRenderEvents } from '@opentui/core'
import { createRoot } from '@opentui/react'
import type { ReactElement } from 'react'
import { resolveOpenTuiRendererOptions } from './options.js'

export function registerTuiRenderer(): void {
  coreRegisterTuiRenderer(async (args: RenderArgs<any, any>) => {
    const component = args.command.render?.(args)

    if (!component) {
      throw new Error('TUI render result is missing. Ensure command.render returns JSX.')
    }

    const renderer = await createCliRenderer(resolveOpenTuiRendererOptions(args.rendererOptions))

    try {
      const done = new Promise<void>((resolve) => {
        renderer.once(CliRenderEvents.DESTROY, () => resolve())
      })

      const root = createRoot(renderer)
      root.render(component as ReactElement)

      await done
    } finally {
      renderer.destroy()
    }
  })
}
