/**
 * Helper functions for creating UI-enabled commands
 */

import React from 'react'
import type { Command, Options, HandlerArgs } from '@bunli/core'
import type { UIContext } from './index.js'

// Extend HandlerArgs with UI context
export interface UIHandlerArgs<TFlags = Record<string, unknown>, TStore = {}> 
  extends HandlerArgs<TFlags, TStore> {
  ui: UIContext
}

// Simplified type inference for now
// TODO: Import proper types when available from core
type InferOptions<T extends Options> = Record<string, any>

/**
 * Define a command with UI support
 */
export function defineUICommand<TOptions extends Options = Options, TStore = {}>(
  command: Omit<Command<TOptions, TStore>, 'handler'> & {
    handler: (args: UIHandlerArgs<InferOptions<TOptions>, TStore>) => void | Promise<void>
  }
): Command<TOptions, TStore> {
  return command as Command<TOptions, TStore>
}

/**
 * Define a component-based command
 * The component receives flags as props
 */
export function defineComponentCommand<TOptions extends Options = Options, TStore = {}>(
  config: Omit<Command<TOptions, TStore>, 'handler'> & {
    component: React.ComponentType<InferOptions<TOptions>>
    // Optional data fetcher (like getServerSideProps)
    getData?: (args: HandlerArgs<InferOptions<TOptions>, TStore>) => Promise<any>
  }
): Command<TOptions, TStore> {
  return {
    ...config,
    handler: async (args) => {
      const { ui } = args as UIHandlerArgs<InferOptions<TOptions>, TStore>
      
      // Fetch data if getData is provided
      let data = {}
      if (config.getData) {
        data = await config.getData(args)
      }
      
      // Render component with flags and data as props
      const Component = config.component
      await ui.render(
        <Component {...args.flags} {...data} />
      )
      
      // Keep UI running until exit
      await ui.waitForExit()
    }
  } as Command<TOptions, TStore>
}

/**
 * Create a multi-screen command with routing
 */
export interface Route<TProps = any> {
  path: string
  component: React.ComponentType<TProps>
  getData?: (args: HandlerArgs) => Promise<TProps>
}

export function defineRoutedCommand<TOptions extends Options = Options, TStore = {}>(
  config: Omit<Command<TOptions, TStore>, 'handler'> & {
    routes: Route[]
    layout?: React.ComponentType<{ children: React.ReactNode }>
  }
): Command<TOptions, TStore> {
  return {
    ...config,
    handler: async (args) => {
      const { ui } = args as UIHandlerArgs<InferOptions<TOptions>, TStore>
      const { Router } = await import('@bunli/ui')
      
      const Layout = config.layout || (({ children }) => <>{children}</>)
      
      await ui.render(
        <Layout>
          <Router routes={config.routes} />
        </Layout>
      )
      
      await ui.waitForExit()
    }
  } as Command<TOptions, TStore>
}

/**
 * Wrap an existing command with UI enhancement
 */
export function withUI<TOptions extends Options = Options, TStore = {}>(
  command: Command<TOptions, TStore>,
  enhance: (
    args: UIHandlerArgs<InferOptions<TOptions>, TStore>,
    originalHandler: () => Promise<void>
  ) => void | Promise<void>
): Command<TOptions, TStore> {
  const originalHandler = command.handler
  
  return {
    ...command,
    handler: async (args) => {
      const uiArgs = args as UIHandlerArgs<InferOptions<TOptions>, TStore>
      
      await enhance(uiArgs, async () => {
        if (originalHandler) {
          await originalHandler(args)
        }
      })
    }
  } as Command<TOptions, TStore>
}