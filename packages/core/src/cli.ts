import type { CLI, Command, BunliConfig, CommandManifest, CommandLoader, ResolvedConfig, CLIOption, TerminalInfo, RuntimeInfo } from './types.js'
import { bunliConfigStrictSchema, bunliConfigSchema } from './config.js'
import { loadConfig, type LoadedConfig } from './config-loader.js'
import { parseArgs } from './parser.js'
import { SchemaError, getDotPath } from '@standard-schema/utils'
import { PluginManager } from './plugin/manager.js'
import type { BunliPlugin, MergeStores, PluginConfig } from './plugin/types.js'
import { CommandContext, createEnvironmentInfo } from './plugin/context.js'
import { GLOBAL_FLAGS, type GlobalFlags } from './global-flags.js'
import { getTuiRenderer } from './tui/registry.js'
import { loadGeneratedStores } from './generated.js'

export async function createCLI<
  TPlugins extends readonly BunliPlugin[] = []
>(
  configOverride?: Partial<BunliConfig> & { 
    plugins?: TPlugins 
    generated?: string | boolean  // Optional, defaults to true
  }
): Promise<CLI<MergeStores<TPlugins>>> {
  type TStore = MergeStores<TPlugins>
  
  // Auto-load config from bunli.config.ts
  let loadedConfigData: LoadedConfig | null = null
  try {
    loadedConfigData = await loadConfig()
  } catch (error) {
    // If no config file found and no override provided, throw an error
    if (!configOverride || (!configOverride.name && !configOverride.version)) {
      throw new Error(
        '[bunli] No configuration file found. Please create bunli.config.ts, bunli.config.js, or bunli.config.mjs, ' +
        'or provide configuration directly to createCLI().'
      )
    }
    // If override is provided, use it as the base config
    loadedConfigData = null
  }

  // Use loaded config or create from override
  const loadedConfig: BunliConfig = loadedConfigData || (bunliConfigSchema.parse(configOverride || {}) as LoadedConfig)
  
  // Merge override config on top of loaded config
  const mergedConfig = {
    ...loadedConfig,
    ...configOverride,
    // Deep merge plugins arrays
    plugins: configOverride?.plugins || loadedConfig.plugins || []
  }
  
  // Validate and coerce to strict at runtime to ensure required fields
  const parsed = bunliConfigStrictSchema.safeParse(mergedConfig)
  if (!parsed.success) {
    throw new Error('[bunli] Invalid config: ' + JSON.stringify(parsed.error.format()))
  }
  let fullConfig = parsed.data
  
  // Auto-load generated types (always enabled)
  const generatedPath = './.bunli/commands.gen.ts'  // Standard location
  
  try {
    // Resolve path relative to current working directory
    const resolvedPath = generatedPath.startsWith('./') 
      ? new URL(generatedPath, `file://${process.cwd()}/`).href
      : generatedPath
    
    await import(resolvedPath)
    // Side-effect import automatically registers via registerGeneratedStore
  } catch (error) {
    console.warn(`[bunli] Could not load generated types from ${generatedPath}:`, error)
  }
  
  const commands = new Map<string, Command<any, any>>()
  
  // Helper to get terminal information
  function getTerminalInfo(): TerminalInfo {
    const isInteractive = process.stdout.isTTY || false
    const isCI = !!(process.env.CI || 
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.CIRCLECI ||
      process.env.TRAVIS)
    
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24,
      isInteractive,
      isCI,
      supportsColor: isInteractive && !isCI && process.env.TERM !== 'dumb',
      supportsMouse: isInteractive && !isCI && process.env.TERM_PROGRAM !== 'Apple_Terminal'
    }
  }
  const pluginManager = new PluginManager<TStore>()
  
  // Load plugins if configured
  if (mergedConfig.plugins && mergedConfig.plugins.length > 0) {
    await pluginManager.loadPlugins(mergedConfig.plugins as any as PluginConfig[])
    
    // Run setup hooks - this may modify config
    const { config: updatedConfig, commands: pluginCommands, middlewares } = await pluginManager.runSetup(fullConfig)
    // Re-validate after plugins potentially modified config
    fullConfig = bunliConfigStrictSchema.parse(updatedConfig)
    
    // Register plugin commands
    pluginCommands.forEach(cmd => registerCommand(cmd))
  }
  
  // Create resolved config with defaults
  const resolvedConfig: ResolvedConfig = {
    name: fullConfig.name,
    version: fullConfig.version,
    description: fullConfig.description || '',
    commands: fullConfig.commands || {},
    build: fullConfig.build || {
      targets: ['native'],
      compress: false,
      minify: false,
      sourcemap: true
    },
    dev: fullConfig.dev || {
      watch: true,
      inspect: false
    },
    test: fullConfig.test || {
      pattern: ['**/*.test.ts', '**/*.spec.ts'],
      coverage: false,
      watch: false
    },
    workspace: fullConfig.workspace || {
      versionStrategy: 'fixed'
    },
    release: fullConfig.release || {
      npm: true,
      github: false,
      tagFormat: 'v{{version}}',
      conventionalCommits: true
    },
    plugins: fullConfig.plugins || []
  }
  
  // Run configResolved hooks
  if (mergedConfig.plugins && mergedConfig.plugins.length > 0) {
    await pluginManager.runConfigResolved(resolvedConfig)
  }
  
  // Helper to register a command and its aliases
  function registerCommand(cmd: Command<any, any>, path: string[] = []) {
    const fullName = [...path, cmd.name].join(' ')
    commands.set(fullName, cmd)
    
    // Register aliases
    if (cmd.alias) {
      const aliases = Array.isArray(cmd.alias) ? cmd.alias : [cmd.alias]
      aliases.forEach(alias => {
        const aliasPath = [...path, alias].join(' ')
        commands.set(aliasPath, cmd)
      })
    }
    
    // Register nested commands
    if (cmd.commands) {
      cmd.commands.forEach(subCmd => {
        registerCommand(subCmd, [...path, cmd.name])
      })
    }
  }
  
  // Helper to find command by path
  function findCommand(args: string[]): { command: Command<any, any> | undefined; remainingArgs: string[] } {
    // Try to find the deepest matching command
    for (let i = args.length; i > 0; i--) {
      const cmdPath = args.slice(0, i).join(' ')
      const command = commands.get(cmdPath)
      if (command) {
        return { command, remainingArgs: args.slice(i) }
      }
    }
    return { command: undefined, remainingArgs: args }
  }
  
  // Helper to show help for a command
  function showHelp(cmd?: Command<any, TStore>, path: string[] = []) {
    if (!cmd) {
      // Show root help
      console.log(`${fullConfig.name} v${fullConfig.version}`)
      if (fullConfig.description) {
        console.log(fullConfig.description)
      }
      console.log('\nCommands:')
      
      // Show only top-level commands
      const topLevel = new Set<Command<any, TStore>>()
      for (const [name, command] of commands) {
        if (!name.includes(' ') && !command.alias?.includes(name)) {
          topLevel.add(command)
        }
      }
      
      for (const command of topLevel) {
        console.log(`  ${command.name.padEnd(20)} ${command.description}`)
      }
    } else {
      // Show command-specific help
      const fullPath = [...path, cmd.name].join(' ')
      console.log(`Usage: ${fullConfig.name} ${fullPath} [options]`)
      console.log(`\n${cmd.description}`)
      
      if (cmd.options && Object.keys(cmd.options).length > 0) {
        console.log('\nOptions:')
        for (const [name, opt] of Object.entries(cmd.options)) {
          const option = opt as CLIOption<any>
          const flag = `--${name}${option.short ? `, -${option.short}` : ''}`
          const description = option.description || ''
          console.log(`  ${flag.padEnd(20)} ${description}`)
        }
      }
      
      if (cmd.commands && cmd.commands.length > 0) {
        console.log('\nSubcommands:')
        for (const subCmd of cmd.commands) {
          console.log(`  ${subCmd.name.padEnd(20)} ${subCmd.description}`)
        }
      }
    }
  }
  
  function shouldUseRender(
    command: Command<any, any>,
    flags: GlobalFlags & Record<string, unknown>,
    terminal: TerminalInfo
  ): boolean {
    if (!command.render) return false

    // Explicit flags take precedence
    if ((flags as Record<string, unknown>)['no-tui']) return false
    if ((flags as Record<string, unknown>)['tui'] || (flags as Record<string, unknown>)['interactive']) return true

    // Fallback to terminal detection
    return terminal.isInteractive && !terminal.isCI
  }

  function ensureRenderAvailable(command: Command<any, any>) {
    if (!command.render) {
      throw new Error(`Command ${command.name} does not support TUI rendering.`)
    }
    if (!getTuiRenderer()) {
      throw new Error(
        `TUI renderer not registered. Import '@bunli/tui/register' or call registerTuiRenderer before running commands with render.`
      )
    }
  }
  
  
  // Auto-load commands from config if specified
  async function loadFromConfig() {
    if (fullConfig.commands?.manifest) {
      try {
        // Resolve relative to the current working directory
        const manifestPath = fullConfig.commands.manifest.startsWith('.')
          ? `${process.cwd()}/${fullConfig.commands.manifest}`
          : fullConfig.commands.manifest
        
        const manifestModule = await import(manifestPath)
        const manifest = manifestModule.default || manifestModule
        await loadCommandsFromManifest(manifest)
      } catch (error) {
        console.error(`Failed to load command manifest from ${fullConfig.commands.manifest}:`, error)
      }
    }
  }
  
  // Helper function to load commands from manifest
  async function loadCommandsFromManifest(manifest: CommandManifest) {
    async function loadFromManifest(obj: CommandManifest | CommandLoader, path: string[] = []): Promise<Command<any, any>[]> {
      const commands: Command<any, any>[] = []
      
      if (typeof obj === 'function') {
        const { default: command } = await obj()
        return [command]
      }
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'function') {
          // It's a command loader
          const { default: command } = await value()
          commands.push(command)
        } else {
          // It's a nested manifest - create a parent command with subcommands
          const subCommands = await loadFromManifest(value, [...path, key])
          if (subCommands.length > 0) {
            // Create a parent command that contains the subcommands
            // @ts-expect-error - Parent commands with only subcommands don't need handler/render
            const parentCommand: Command<any, TStore> = {
              name: key,
              description: `${key} commands`,
              commands: subCommands
            }
            commands.push(parentCommand)
          }
        }
      }
      
      return commands
    }
    
    const loadedCommands = await loadFromManifest(manifest)
    loadedCommands.forEach(cmd => registerCommand(cmd))
  }
  
  async function runCommandInternal(
    command: Command<any, any>,
    argv: string[],
    providedFlags?: Record<string, unknown>
  ) {
    let context: CommandContext<any> | undefined
    try {
      const mergedOptions = { ...GLOBAL_FLAGS, ...(command.options || {}) }
      const parsed = providedFlags
        ? (() => {
            // Parse with empty args for defaults, then overlay provided flags
            // This keeps behavior consistent with execute(options)
            return parseArgs([], mergedOptions, command.name).then((p) => (Object.assign(p.flags, providedFlags), p))
          })()
        : parseArgs(argv, mergedOptions, command.name)
      const resultParsed = await parsed
      const { prompt, spinner, colors } = await import('@bunli/utils')

      if (mergedConfig.plugins && mergedConfig.plugins.length > 0) {
        context = await pluginManager.runBeforeCommand(
          command.name,
          command,
          providedFlags ? [] : resultParsed.positional,
          resultParsed.flags
        )
      }

      const terminalInfo = getTerminalInfo()
      const globalFlags = resultParsed.flags as GlobalFlags & Record<string, unknown>
      const runtimeInfo: RuntimeInfo = {
        startTime: Date.now(),
        args: providedFlags ? [] : argv,
        command: command.name
      }

      let render = false
      if (command.render) {
        if ((globalFlags as Record<string, unknown>)['no-tui']) render = false
        else if ((globalFlags as Record<string, unknown>)['tui'] || (globalFlags as Record<string, unknown>)['interactive']) render = true
        else render = terminalInfo.isInteractive && !terminalInfo.isCI
      }

      let result: unknown
      if (render) {
        ensureRenderAvailable(command)
        result = await getTuiRenderer<Record<string, unknown>, TStore>()?.({
          command,
          flags: resultParsed.flags,
          positional: resultParsed.positional,
          shell: Bun.$,
          env: process.env,
          cwd: process.cwd(),
          prompt,
          spinner,
          colors,
          terminal: terminalInfo,
          runtime: runtimeInfo,
          ...(context ? { context } : {})
        })
      } else {
        if (!command.handler) throw new Error('Command does not provide a handler for non-TUI execution')
        await command.handler({
          flags: resultParsed.flags,
          positional: resultParsed.positional,
          shell: Bun.$,
          env: process.env,
          cwd: process.cwd(),
          prompt,
          spinner,
          colors,
          terminal: terminalInfo,
          runtime: runtimeInfo,
          ...(context ? { context } : {})
        })
      }

      if (mergedConfig.plugins && mergedConfig.plugins.length > 0 && context) {
        await pluginManager.runAfterCommand(
          context,
          { exitCode: 0 }
        )
      }
    } catch (error) {
      if (mergedConfig.plugins && mergedConfig.plugins.length > 0 && context) {
        await pluginManager.runAfterCommand(
          context,
          { exitCode: 1 }
        )
      }

      const { colors } = await import('@bunli/utils')
      if (error instanceof SchemaError) {
        console.error(colors.red('Validation Error:'))
        const generalErrors: string[] = []
        const fieldErrors: Record<string, string[]> = {}
        for (const issue of error.issues) {
          const path = getDotPath(issue)
          if (path) {
            if (!fieldErrors[path]) fieldErrors[path] = []
            fieldErrors[path].push(issue.message)
          } else {
            generalErrors.push(issue.message)
          }
        }
        for (const [field, messages] of Object.entries(fieldErrors)) {
          console.error(colors.dim(`  ${field}:`))
          for (const message of messages) console.error(colors.dim(`    • ${message}`))
        }
        for (const message of generalErrors) console.error(colors.dim(`  • ${message}`))
        process.exit(1)
      } else if (error instanceof Error) {
        console.error(colors.red(`Error: ${error.message}`))
        process.exit(1)
      }
      throw error
    }
  }

  const api: CLI<MergeStores<TPlugins>> = {
    command<TCommandStore = any>(cmd: Command<any, TCommandStore>) {
      registerCommand(cmd)
    },
    
    async load(manifest: CommandManifest) {
      await loadCommandsFromManifest(manifest)
    },
    
    async init() {
      await loadFromConfig()
    },
    
    async run(argv = process.argv.slice(2)) {
      if (argv.length === 0) {
        showHelp()
        return
      }
      
      // Handle version flag
      if (argv.includes('--version') || argv.includes('-v')) {
        console.log(`${fullConfig.name} v${fullConfig.version}`)
        return
      }
      
      // Handle help flags
      if (argv.includes('--help') || argv.includes('-h')) {
        const helpIndex = Math.max(argv.indexOf('--help'), argv.indexOf('-h'))
        const cmdArgs = argv.slice(0, helpIndex)
        
        if (cmdArgs.length === 0) {
          showHelp()
        } else {
          const { command } = findCommand(cmdArgs)
          if (command) {
            showHelp(command, cmdArgs.slice(0, -1))
          } else {
            console.error(`Unknown command: ${cmdArgs.join(' ')}`)
            process.exit(1)
          }
        }
        return
      }
      
      // Find and execute command
      const { command, remainingArgs } = findCommand(argv)
      
      if (!command) {
        console.error(`Unknown command: ${argv[0]}`)
        process.exit(1)
      }
      
      // If command has subcommands but no handler, show help
      if (!command.handler && !command.render && command.commands) {
        showHelp(command, argv.slice(0, argv.length - remainingArgs.length - 1))
        return
      }
      
      if (command.handler || command.render) {
        await runCommandInternal(command, remainingArgs)
      }
    },
    
    async execute(commandName: string, argsOrOptions?: string[] | Record<string, any>, options?: Record<string, any>) {
      // Parse command name to handle nested commands (git/sync -> git sync)
      const commandPath = commandName.replace(/\//g, ' ').split(' ')
      const { command, remainingArgs } = findCommand(commandPath)
      if (!command) {
        throw new Error(`Command '${commandName}' not found`)
      }
      
      // Handle different overload patterns
      let finalArgs: string[] = []
      let finalOptions: Record<string, any> = {}
      
      if (argsOrOptions && !Array.isArray(argsOrOptions)) {
        // Pattern: execute(commandName, options)
        finalOptions = argsOrOptions as Record<string, any>
      } else if (Array.isArray(argsOrOptions) && options) {
        // Pattern: execute(commandName, args, options)
        finalArgs = argsOrOptions
        finalOptions = options
      } else if (Array.isArray(argsOrOptions)) {
        // Pattern: execute(commandName, args)
        finalArgs = argsOrOptions
      }
      
      // If options object provided, use directly as flags
      if (Object.keys(finalOptions).length > 0) {
        
        // Merge global flags with command options
        const mergedOptions = {
          ...GLOBAL_FLAGS,
          ...(command.options || {})
        }
        
        // Parse with empty args to get defaults, then merge options
        const parsed = await parseArgs([], mergedOptions, command.name)
        Object.assign(parsed.flags, finalOptions)
        
        const { prompt, spinner, colors } = await import('@bunli/utils')
        
        // Run beforeCommand hooks if plugins are loaded
        let context: CommandContext<TStore> | undefined
        if (mergedConfig.plugins && mergedConfig.plugins.length > 0) {
          context = await pluginManager.runBeforeCommand(
            command.name,
            command,
            [],
            parsed.flags
          )
        }
        
        // Create runtime info
        const runtimeInfo: RuntimeInfo = {
          startTime: Date.now(),
          args: [],
          command: command.name
        }
        
        const terminalInfo = getTerminalInfo()
        
        if (command.handler) {
        await command.handler({
          flags: parsed.flags,
          positional: [],
          shell: Bun.$,
          env: process.env,
          cwd: process.cwd(),
          prompt,
          spinner,
          colors,
          terminal: terminalInfo,
          runtime: runtimeInfo,
          ...(context ? { context } : {})
        })
        }
        
        // Run afterCommand hooks if plugins are loaded
        if (mergedConfig.plugins && mergedConfig.plugins.length > 0 && context) {
          await pluginManager.runAfterCommand(
            context,
            { exitCode: 0 }
          )
        }
        return
      }
      
      // Parse string args normally
      const args = finalArgs.length > 0 ? finalArgs : (argsOrOptions as string[] | undefined) || []
      // Use the already found command and remaining args
      const foundCommand = command
      const finalArgsToUse = [...remainingArgs, ...args]
      
      // Execute the command using the same logic as the run method
      if (foundCommand.handler || foundCommand.render) {
        await runCommandInternal(foundCommand, finalArgsToUse)
      }
    }
  }

  // Auto-register any generated command stores with this CLI instance
  loadGeneratedStores(api)

  return api
}