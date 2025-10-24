/**
 * Plugin system public API
 */

export * from './types.js'
export { PluginManager } from './manager.js'
export { PluginContext, CommandContext, createEnvironmentInfo } from './context.js'

// Plugin development utilities
export { createPlugin, createTestPlugin, composePlugins } from './create.js'

// Plugin testing utilities
export { 
  createMockPluginContext, 
  createMockCommandContext, 
  testPluginHooks, 
  assertPluginBehavior 
} from './testing.js'

// Re-export for convenience
export type { 
  BunliPlugin,
  PluginFactory,
  PluginConfig,
  PluginContext as IPluginContext,
  CommandContext as ICommandContext,
  CommandResult,
  PathInfo,
  EnvironmentInfo,
  Middleware
} from './types.js'