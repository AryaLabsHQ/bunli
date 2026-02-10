export type ShellType = 'bash' | 'zsh' | 'fish' | 'powershell'

export interface CompletionsPluginOptions {
  /**
   * Path to Bunli-generated command metadata.
   * Default: ".bunli/commands.gen.ts" (relative to process.cwd()).
   */
  generatedPath?: string

  /**
   * Name registered with the shell completion script (usually the package.json bin key).
   */
  commandName?: string

  /**
   * Executable invocation used by shell scripts (can include args, e.g. "bunx my-cli").
   * Default: commandName.
   */
  executable?: string

  /**
   * Whether to register command aliases from generated metadata.
   * Default: true.
   */
  includeAliases?: boolean

  /**
   * Whether to include Bunli global flags on every command.
   * Default: true.
   */
  includeGlobalFlags?: boolean
}

