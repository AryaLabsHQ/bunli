import type { CLI, Command, BunliConfig, CommandManifest, CommandLoader, Flags } from './types.js'
import { parseArgs } from './parser.js'

export function createCLI(config: BunliConfig | { name: string; version: string; description?: string }): CLI {
  // Normalize config - support both simple and full config
  const fullConfig: BunliConfig = 'commands' in config
    ? config as BunliConfig 
    : { ...config, commands: undefined }
  
  const commands = new Map<string, Command>()
  
  // Helper to register a command and its aliases
  function registerCommand(cmd: Command, path: string[] = []) {
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
  function findCommand(args: string[]): { command: Command | undefined; remainingArgs: string[] } {
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
  function showHelp(cmd?: Command, path: string[] = []) {
    if (!cmd) {
      // Show root help
      console.log(`${fullConfig.name} v${fullConfig.version}`)
      if (fullConfig.description) {
        console.log(fullConfig.description)
      }
      console.log('\nCommands:')
      
      // Show only top-level commands
      const topLevel = new Set<Command>()
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
        for (const [name, option] of Object.entries(cmd.options)) {
          const flag = `--${name}${option.short ? `, -${option.short}` : ''}`
          const required = option.required ? ' (required)' : ''
          console.log(`  ${flag.padEnd(20)} ${option.description || ''}${required}`)
          if (option.default !== undefined) {
            console.log(`  ${''.padEnd(20)} (default: ${option.default})`)
          }
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
    async function loadFromManifest(obj: CommandManifest | CommandLoader, path: string[] = []): Promise<Command[]> {
      const commands: Command[] = []
      
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
            const parentCommand: Command = {
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
    command<T extends Flags>(cmd: Command<T>) {
      registerCommand(cmd as Command)
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
        try {
          const parsed = await parseArgs(remainingArgs, command.options || {})
          await command.handler({
            flags: parsed.flags,
            positional: parsed.positional,
            shell: Bun.$,
            env: process.env,
            cwd: process.cwd()
          })
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('Missing required option:')) {
            console.error(`Error: ${error.message}`)
            console.error(`\nRun '${fullConfig.name} ${command.name} --help' for usage information.`)
            process.exit(1)
          }
          throw error
        }
      }
    }
  }
}