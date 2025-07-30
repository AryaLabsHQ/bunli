import type { CLI, Command, BunliConfig, CommandManifest, CommandLoader, ResolvedConfig, CLIOption, TerminalInfo, RuntimeInfo } from './types.js'
import { parseArgs } from './parser.js'
import { SchemaError, getDotPath } from '@standard-schema/utils'
import { PluginManager } from './plugin/manager.js'
import type { CommandContext, BunliPlugin, MergeStores } from './plugin/types.js'
import { GLOBAL_FLAGS, type GlobalFlags } from './global-flags.js'

export async function createCLI<TPlugins extends readonly BunliPlugin[] = []>(
  config: BunliConfig & { 
    plugins?: TPlugins 
  }
): Promise<CLI<MergeStores<TPlugins>>> {
  type TStore = MergeStores<TPlugins>
  
  // Normalize config - support both simple and full config
  let fullConfig: BunliConfig = 'commands' in config
    ? config as BunliConfig 
    : { ...config, commands: undefined }
  
  const commands = new Map<string, Command<any, TStore>>()
  
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
  const pluginManager = new PluginManager()
  
  // Load plugins if configured
  if ('plugins' in fullConfig && fullConfig.plugins) {
    await pluginManager.loadPlugins(fullConfig.plugins)
    
    // Run setup hooks - this may modify config
    const { config: updatedConfig, commands: pluginCommands, middlewares } = await pluginManager.runSetup(fullConfig)
    fullConfig = updatedConfig as BunliConfig
    
    // Register plugin commands
    pluginCommands.forEach(cmd => registerCommand(cmd))
  }
  
  // Create resolved config with defaults
  const resolvedConfig: ResolvedConfig = {
    name: fullConfig.name,
    version: fullConfig.version,
    description: fullConfig.description || '',
    commands: fullConfig.commands || {},
    build: fullConfig.build || {},
    dev: fullConfig.dev || {},
    plugins: fullConfig.plugins || []
  }
  
  // Run configResolved hooks
  if ('plugins' in fullConfig && fullConfig.plugins) {
    await pluginManager.runConfigResolved(resolvedConfig)
  }
  
  // Helper to register a command and its aliases
  function registerCommand(cmd: Command<any, TStore>, path: string[] = []) {
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
  function findCommand(args: string[]): { command: Command<any, TStore> | undefined; remainingArgs: string[] } {
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
    async function loadFromManifest(obj: CommandManifest | CommandLoader, path: string[] = []): Promise<Command<any, TStore>[]> {
      const commands: Command<any, TStore>[] = []
      
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
  
  return {
    command(cmd: Command<any, TStore>) {
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
      if (!command.handler && command.commands) {
        showHelp(command, argv.slice(0, argv.length - remainingArgs.length - 1))
        return
      }
      
      if (command.handler) {
        let context: CommandContext<TStore> | undefined
        
        try {
          // Merge global flags with command options
          const mergedOptions = {
            ...GLOBAL_FLAGS,
            ...(command.options || {})
          }
          
          const parsed = await parseArgs(remainingArgs, mergedOptions)
          const { prompt, spinner, colors } = await import('@bunli/utils')
          
          // Run beforeCommand hooks if plugins are loaded
          if ('plugins' in fullConfig && fullConfig.plugins) {
            context = await pluginManager.runBeforeCommand(
              command.name,
              command,
              parsed.positional,
              parsed.flags as any
            )
          }
          
          // Check if we should enable TUI mode
          const globalFlags = parsed.flags as GlobalFlags & Record<string, unknown>
          if ((globalFlags.interactive || globalFlags.tui)) {
            // TUI mode will be handled by the plugin-tui if loaded
            // We just need to ensure the flags are passed through
          }
          
          // Create runtime info
          const runtimeInfo: RuntimeInfo = {
            startTime: Date.now(),
            args: remainingArgs,
            command: command.name
          }
          
          const result = await command.handler({
            flags: parsed.flags as any, // Type-safe after validation
            positional: parsed.positional,
            shell: Bun.$,
            env: process.env,
            cwd: process.cwd(),
            prompt,
            spinner,
            colors,
            terminal: getTerminalInfo(),
            runtime: runtimeInfo,
            // Add context if plugins are loaded
            ...(context ? { context } : {})
          })
          
          // Run afterCommand hooks if plugins are loaded
          if ('plugins' in fullConfig && fullConfig.plugins && context) {
            await pluginManager.runAfterCommand(context as any, {
              result,
              exitCode: 0
            })
          }
        } catch (error) {
          // Run afterCommand hooks even on error
          if ('plugins' in fullConfig && fullConfig.plugins && context) {
            await pluginManager.runAfterCommand(context as any, {
              error: error as Error,
              exitCode: 1
            })
          }
          
          const { colors } = await import('@bunli/utils')
          
          if (error instanceof SchemaError) {
            console.error(colors.red('Validation errors:'))
            
            const fieldErrors: Record<string, string[]> = {}
            const generalErrors: string[] = []
            
            for (const issue of error.issues) {
              const dotPath = getDotPath(issue)
              if (dotPath) {
                // Group by field for cleaner output
                fieldErrors[dotPath] ??= []
                fieldErrors[dotPath].push(issue.message)
              } else {
                generalErrors.push(issue.message)
              }
            }
            
            // Display field-specific errors
            for (const [field, messages] of Object.entries(fieldErrors)) {
              console.error(colors.yellow(`  --${field}:`))
              for (const message of messages) {
                console.error(colors.dim(`    • ${message}`))
              }
            }
            
            // Display general errors
            for (const message of generalErrors) {
              console.error(colors.dim(`  • ${message}`))
            }
            
            process.exit(1)
          } else if (error instanceof Error) {
            console.error(colors.red(`Error: ${error.message}`))
            process.exit(1)
          }
          throw error
        }
      }
    }
  }
}