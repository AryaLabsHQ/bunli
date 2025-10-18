import { registerTuiRenderer as coreRegisterTuiRenderer } from '@bunli/core'
import type { RenderArgs } from '@bunli/core'
import { render as opentuiRender } from '@opentui/react'
import type { ReactElement } from 'react'

export function registerTuiRenderer(): void {
  coreRegisterTuiRenderer(async (args: RenderArgs<any, any>) => {
    const component = args.command.render?.(args)

    if (!component) {
      throw new Error('TUI render result is missing. Ensure command.render returns JSX.')
    }

    await opentuiRender(component as ReactElement, {
      exitOnCtrlC: args.rendererOptions?.exitOnCtrlC ?? true,
      targetFps: args.rendererOptions?.targetFps ?? 30,
      enableMouseMovement: args.rendererOptions?.enableMouseMovement ?? true,
      ...args.rendererOptions
    })
  })
}
