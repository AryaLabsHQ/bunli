import type {
  CLI,
  Command,
  BunliConfig,
  BunliConfigInput,
  ResolvedConfig,
  CLIOption,
  TerminalInfo,
  RuntimeInfo
} from './types.js'
import type { ResolvedTuiImageOptions } from './types.js'
import { bunliConfigStrictSchema, bunliConfigSchema } from './config.js'
import { ConfigLoadError, ConfigNotFoundError, loadConfigResult } from './config-loader.js'
import { parseArgs } from './parser.js'
import { SchemaError, getDotPath } from '@standard-schema/utils'
import { colors } from '@bunli/utils'
import { PromptCancelledError, createPromptSession } from '@bunli/runtime/prompt'
import { PluginManager } from './plugin/manager.js'
import type { BunliPlugin, MergeStores } from './plugin/types.js'
import type { CommandContext } from './plugin/context.js'
import { GLOBAL_FLAGS } from './global-flags.js'
import { loadGeneratedStores } from './generated.js'
import { createLogger } from './utils/logger.js'
import { createInterruptController, ProcessTerminatedError } from './runtime/interrupt-controller.js'
import { runTuiRender } from './runtime/tui-render.js'
import { resolveImageRenderMode } from '@bunli/runtime/image'
import { Result } from 'better-result'
import { validateValue } from './validation.js'
import { findSuggestion } from './utils/levenshtein.js'
import { resolveFormat, shouldRenderOutput } from './output/policy.js'
import { format as formatOutput } from './output/formatter.js'
import { serializeCliError } from './output/serialize.js'
import type { OutputFormat } from './output/types.js'
import {
  BunliValidationError,
  CommandExecutionError,
  CommandNotFoundError,
  InvalidConfigError,
  OptionValidationError
} from './errors.js'
import { renderIndex as renderManifestIndex, renderFull as renderManifestFull } from './manifest/index.js'
import {
  collectTopLevelCommands,
  renderCommandHelp,
  renderRootHelp,
  showHelp as showHelpImpl
} from './help/index.js'
import type { HelpContext } from './help/renderer.js'

const logger = createLogger('core:cli')
const interruptLogger = createLogger('core:interrupt')
type GlobalFlagName = keyof typeof GLOBAL_FLAGS

function resolveRendererOptions(
  configured: Record<string, unknown> | undefined,
  commandConfigured: Record<string, unknown> | undefined
): Record<string, unknown> {
  const merged = {
    ...(configured ?? {}),
    ...(commandConfigured ?? {})
  }

  const configuredBufferMode =
    (merged.bufferMode === 'alternate' || merged.bufferMode === 'standard')
      ? (merged.bufferMode as 'alternate' | 'standard')
      : undefined

  return {
    ...merged,
    bufferMode: configuredBufferMode ?? 'standard'
  }
}

function resolveImageOptions(
  configured: Record<string, unknown> | undefined,
  commandConfigured: Record<string, unknown> | undefined,
  flagMode: unknown
): ResolvedTuiImageOptions {
  const merged = {
    ...(configured ?? {}),
    ...(commandConfigured ?? {})
  }

  const configuredMode =
    (merged.mode === 'off' || merged.mode === 'auto' || merged.mode === 'on')
      ? merged.mode
      : undefined
  const cliFlagMode =
    (flagMode === 'off' || flagMode === 'auto' || flagMode === 'on')
      ? flagMode
      : undefined
  const protocol =
    (merged.protocol === 'auto' || merged.protocol === 'kitty')
      ? merged.protocol
      : 'auto'
  const width =
    (typeof merged.width === 'number' && Number.isFinite(merged.width) && merged.width > 0)
      ? Math.floor(merged.width)
      : undefined
  const height =
    (typeof merged.height === 'number' && Number.isFinite(merged.height) && merged.height > 0)
      ? Math.floor(merged.height)
      : undefined

  return {
    mode: resolveImageRenderMode({
      flagMode: cliFlagMode,
      configMode: configuredMode,
      defaultMode: 'auto'
    }),
    protocol,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {})
  }
}

interface CreateCLIRuntimeDeps {
  createPromptSession?: typeof createPromptSession
  runTuiRender?: typeof runTuiRender
  getTerminalInfo?: () => TerminalInfo
}

interface OutputContext {
  format: OutputFormat
  formatExplicit: boolean
  agent: boolean
}

const disableTerminalFocusReporting = () => {
  if (!process.stdout.isTTY) return
  try {
    process.stdout.write('\x1b[?1004l')
  } catch {
    // Ignore terminal write failures during shutdown.
  }
}

export async function createCLI<
  TPlugins extends readonly BunliPlugin[] = []
>(
  configOverride?: BunliConfigInput & {
    plugins?: TPlugins 
    generated?: string | boolean  // Optional, defaults to true
  },
  runtimeDeps: CreateCLIRuntimeDeps = {}
): Promise<CLI<MergeStores<TPlugins>>> {
  type TStore = MergeStores<TPlugins>

  const hasUsableInlineOverride = Boolean(
    configOverride?.name &&
    configOverride?.version
  )
  
  // Auto-load config from bunli.config.ts
  let loadedConfigData: BunliConfig | null = null
  const loadedConfigResult = await loadConfigResult()
  if (loadedConfigResult.isOk()) {
    loadedConfigData = loadedConfigResult.value
  } else {
    const missingRequiredOverride = !hasUsableInlineOverride
    if (missingRequiredOverride && loadedConfigResult.error instanceof ConfigNotFoundError) {
      throw new ConfigNotFoundError({
        message:
          '[bunli] No configuration file found. Please create bunli.config.ts, bunli.config.js, or bunli.config.mjs, ' +
          'or provide configuration directly to createCLI().',
        searched: loadedConfigResult.error.searched
      })
    }
    if (loadedConfigResult.error instanceof ConfigLoadError && missingRequiredOverride) {
      throw loadedConfigResult.error
    }
  }

  // Use loaded config or create from override
  const loadedConfig: BunliConfig = loadedConfigData || bunliConfigSchema.parse(configOverride || {})
  
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
    throw new InvalidConfigError({
      message: '[bunli] Invalid config: ' + JSON.stringify(parsed.error.format()),
      cause: parsed.error
    })
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
    logger.debug('Could not load generated types from %s: %O', generatedPath, error)
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
  const cliDeps = {
    createPromptSession: runtimeDeps.createPromptSession ?? createPromptSession,
    runTuiRender: runtimeDeps.runTuiRender ?? runTuiRender,
    getTerminalInfo: runtimeDeps.getTerminalInfo ?? getTerminalInfo
  }
  const pluginManager = new PluginManager<TStore>()
  
  // Load plugins if configured
  if (fullConfig.plugins && fullConfig.plugins.length > 0) {
    await pluginManager.loadPlugins(fullConfig.plugins)
    pluginManager.setSetupStoreValue('_skillsCommands', commands)
    pluginManager.setSetupStoreValue('_skillsCliName', fullConfig.name)
    
    // Run setup hooks - this may modify config
    const { config: updatedConfig, commands: pluginCommands, middlewares } = await pluginManager.runSetup(fullConfig)
    // Re-validate after plugins potentially modified config
    fullConfig = bunliConfigStrictSchema.parse(updatedConfig)
    pluginManager.setSetupStoreValue('_skillsCliName', fullConfig.name)
    
    // Register plugin commands
    for (const cmd of pluginCommands) {
      registerCommand(cmd)
    }
  }
  
  // Create resolved config with defaults
  const resolvedConfig: ResolvedConfig = {
    name: fullConfig.name,
    version: fullConfig.version,
    description: fullConfig.description || '',
    commands: fullConfig.commands || {
      entry: undefined,
      directory: undefined,
      generateReport: undefined
    },
    build: fullConfig.build || {
      targets: [],
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
    plugins: fullConfig.plugins || [],
    help: fullConfig.help,
    tui: fullConfig.tui
  }
  
  // Run configResolved hooks
  if (fullConfig.plugins && fullConfig.plugins.length > 0) {
    await pluginManager.runConfigResolved(resolvedConfig)
  }
  
  // Helper to register a command and its aliases
  function registerCommand(cmd: Command<any, any>, path: string[] = []) {
    const registrationPaths = new Map<string, string[]>()
    const canonicalPath = [...path, cmd.name]
    registrationPaths.set(canonicalPath.join(' '), canonicalPath)

    // Register aliases for this command/group at the current depth.
    if (cmd.alias) {
      const aliases = Array.isArray(cmd.alias) ? cmd.alias : [cmd.alias]
      aliases.forEach(alias => {
        const aliasPath = [...path, alias]
        registrationPaths.set(aliasPath.join(' '), aliasPath)
      })
    }

    for (const [fullName] of registrationPaths) {
      commands.set(fullName, cmd)
    }

    // Register nested commands under all parent aliases and canonical paths.
    if (cmd.commands) {
      cmd.commands.forEach(subCmd => {
        for (const parentPath of registrationPaths.values()) {
          registerCommand(subCmd, parentPath)
        }
      })
    }
  }
  
  // Helper to get available top-level command names
  function getAvailableCommandNames(): string[] {
    const names = new Set<string>()
    for (const [name] of commands) {
      if (!name.includes(' ')) {
        names.add(name)
      }
    }
    return Array.from(names).sort()
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

  function isBooleanGlobalFlag(flag: CLIOption<any>): boolean {
    return flag.argumentKind === 'flag'
  }

  function stripRecognizedGlobalFlags(args: string[]): { args: string[]; originalIndexes: number[] } {
    const positional: string[] = []
    const originalIndexes: number[] = []
    const shortToName = new Map<string, GlobalFlagName>()

    const getGlobalFlag = (name: string): CLIOption<any> | undefined => {
      if (Object.prototype.hasOwnProperty.call(GLOBAL_FLAGS, name)) {
        return GLOBAL_FLAGS[name as GlobalFlagName]
      }
      return undefined
    }

    for (const [name, option] of Object.entries(GLOBAL_FLAGS) as Array<[GlobalFlagName, CLIOption<any>]>) {
      if (option.short) {
        shortToName.set(option.short, name)
      }
    }

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (!arg) continue

      if (arg.startsWith('--')) {
        const eqIndex = arg.indexOf('=')
        const name = eqIndex > 0 ? arg.slice(2, eqIndex) : arg.slice(2)
        const flag = name ? getGlobalFlag(name) : undefined
        if (flag) {
          if (
            eqIndex < 0 &&
            i + 1 < args.length &&
            !args[i + 1]?.startsWith('-') &&
            (
              !isBooleanGlobalFlag(flag) ||
              args[i + 1] === 'true' ||
              args[i + 1] === 'false'
            )
          ) {
            i += 1
          }
          continue
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        const short = arg.slice(1)
        const name = shortToName.get(short)
        const flag = name ? getGlobalFlag(name) : undefined
        if (flag) {
          if (
            i + 1 < args.length &&
            !args[i + 1]?.startsWith('-') &&
            (
              !isBooleanGlobalFlag(flag) ||
              args[i + 1] === 'true' ||
              args[i + 1] === 'false'
            )
          ) {
            i += 1
          }
          continue
        }
      }

      positional.push(arg)
      originalIndexes.push(i)
    }

    return { args: positional, originalIndexes }
  }

  function getGlobalFlagsForCommand(command?: Command<any, any>): Record<string, CLIOption<any>> {
    if (!command?.options) {
      return GLOBAL_FLAGS
    }

    const commandOptionNames = new Set(Object.keys(command.options))
    const preservedGlobalFlags = new Set<GlobalFlagName>([
      'help',
      'version',
      'llms',
      'llms-full'
    ])

    return Object.fromEntries(
      Object.entries(GLOBAL_FLAGS).filter(
        ([name]) => preservedGlobalFlags.has(name as GlobalFlagName) || !commandOptionNames.has(name)
      )
    ) as Record<string, CLIOption<any>>
  }

  function extractExplicitOutputFormat(args: string[]): OutputFormat | undefined {
    let format: OutputFormat | undefined

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (!arg) continue

      if (arg.startsWith('--format=')) {
        const value = arg.slice('--format='.length)
        if (value === 'json' || value === 'yaml' || value === 'md' || value === 'toon') {
          format = value
        }
        continue
      }

      if (arg === '--format') {
        const value = args[i + 1]
        if (value === 'json' || value === 'yaml' || value === 'md' || value === 'toon') {
          format = value
          i += 1
          continue
        }
      }
    }

    return format
  }
  
  // Help rendering — delegates to the extracted help module
  function showHelp(cmd?: Command<any, TStore>, path: string[] = []) {
    const terminalInfo = cliDeps.getTerminalInfo()
    const helpCtx: HelpContext = {
      cliName: fullConfig.name,
      version: fullConfig.version,
      description: fullConfig.description,
      terminal: terminalInfo
    }
    const customRenderer = fullConfig.help?.renderer as import('./types.js').HelpRenderer<TStore> | undefined
    showHelpImpl(helpCtx, commands, customRenderer, cmd, path)
  }

  function resolveOutputContext(
    terminalInfo: TerminalInfo,
    flagFormat?: OutputFormat,
    commandDefault?: OutputFormat
  ): OutputContext {
    const { format, formatExplicit, agent } = resolveFormat({
      flagFormat,
      commandDefault,
      isTTY: terminalInfo.isInteractive
    })

    return {
      format,
      formatExplicit,
      agent
    }
  }

  function writeFormatted(
    stream: 'stdout' | 'stderr',
    value: unknown,
    fmt: OutputFormat
  ) {
    const rendered = formatOutput(value, fmt)
    if (!rendered) return

    const target = stream === 'stdout' ? process.stdout : process.stderr
    target.write(rendered + '\n')
  }

  function printVersion(outputContext: OutputContext) {
    const text = `${fullConfig.name} v${fullConfig.version}`
    if (outputContext.format === 'toon') {
      process.stdout.write(text + '\n')
      return
    }

    writeFormatted('stdout', {
      ok: true,
      data: {
        type: 'version',
        name: fullConfig.name,
        version: fullConfig.version
      }
    }, outputContext.format)
  }

  function renderBuiltInHelpText(
    terminalInfo: TerminalInfo,
    cmd?: Command<any, TStore>,
    path: string[] = []
  ): string {
    const helpCtx: HelpContext = {
      cliName: fullConfig.name,
      version: fullConfig.version,
      description: fullConfig.description,
      terminal: terminalInfo
    }

    if (!cmd) {
      return renderRootHelp(helpCtx, collectTopLevelCommands(commands))
    }

    return renderCommandHelp(helpCtx, cmd, path)
  }

  function printHelpOutput(
    outputContext: OutputContext,
    terminalInfo: TerminalInfo,
    cmd?: Command<any, TStore>,
    path: string[] = []
  ) {
    const customRenderer = fullConfig.help?.renderer as import('./types.js').HelpRenderer<TStore> | undefined
    if (outputContext.format === 'toon' || customRenderer) {
      showHelpImpl(
        {
          cliName: fullConfig.name,
          version: fullConfig.version,
          description: fullConfig.description,
          terminal: terminalInfo
        },
        commands,
        customRenderer,
        cmd,
        path
      )
      return
    }

    const helpText = renderBuiltInHelpText(terminalInfo, cmd, path)
    writeFormatted('stdout', {
      ok: true,
      data: {
        type: 'help',
        cliName: fullConfig.name,
        version: fullConfig.version,
        path: cmd ? [...path, cmd.name] : path,
        text: helpText
      }
    }, outputContext.format)
  }

  function printManifestOutput(
    outputContext: OutputContext,
    variant: 'compact' | 'full',
    markdown: string
  ) {
    if (outputContext.format === 'toon' || outputContext.format === 'md') {
      process.stdout.write(markdown + '\n')
      return
    }

    writeFormatted('stdout', {
      ok: true,
      data: {
        type: 'manifest',
        variant,
        markdown
      }
    }, outputContext.format)
  }
  
  function shouldUseRender(
    command: Command<any, any>,
    terminal: TerminalInfo
  ): boolean {
    if (!command.render) return false
    return terminal.isInteractive && !terminal.isCI
  }

  function ensureRenderAvailable(command: Command<any, any>) {
    if (!command.render) {
      throw new Error(`Command ${command.name} does not support TUI rendering.`)
    }
  }

  type RunCommandError =
    | SchemaError
    | BunliValidationError
    | PromptCancelledError
    | OptionValidationError
    | CommandExecutionError
    | Error

  async function mergeProvidedFlags(
    commandName: string,
    mergedOptions: Record<string, CLIOption<any>>,
    currentFlags: Record<string, unknown>,
    providedFlags: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>, OptionValidationError>> {
    const nextFlags = { ...currentFlags }

    for (const [name, value] of Object.entries(providedFlags)) {
      const option = mergedOptions[name]
      if (!option) {
        return Result.err(new OptionValidationError({
          message: `Unknown option '${name}' for command '${commandName}'`,
          command: commandName,
          option: name,
          cause: value,
          issues: [{ message: `Unknown option '${name}'`, path: name }]
        }))
      }

      try {
        nextFlags[name] = await validateValue(value, option.schema, { option: name, command: commandName })
      } catch (error) {
        return Result.err(new OptionValidationError({
          message: error instanceof Error ? error.message : `Invalid option '${name}'`,
          command: commandName,
          option: name,
          cause: error,
          issues: [{ message: error instanceof Error ? error.message : `Invalid option '${name}'`, path: name }]
        }))
      }
    }

    return Result.ok(nextFlags)
  }

  async function renderValidationError(error: SchemaError) {
    console.error(colors.red('Validation Error:'))
    const generalErrors: string[] = []
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of error.issues) {
      const path = getDotPath(issue)
      if (path) {
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path]?.push(issue.message)
      } else {
        generalErrors.push(issue.message)
      }
    }
    for (const [field, messages] of Object.entries(fieldErrors)) {
      console.error(colors.dim(`  ${field}:`))
      for (const message of messages) console.error(colors.dim(`    • ${message}`))
    }
    for (const message of generalErrors) console.error(colors.dim(`  • ${message}`))
  }
  
  async function runCommandInternal(
    command: Command<any, TStore>,
    argv: string[],
    providedFlags?: Record<string, unknown>,
    invokedCommandName?: string
  ): Promise<Result<void, RunCommandError>> {
    let context: CommandContext<TStore> | undefined
    let promptSession: ReturnType<typeof createPromptSession> | undefined
    let interruptController: ReturnType<typeof createInterruptController> | undefined
    let afterCommandPromise: Promise<void> | undefined

    const runAfterCommandOnce = async (exitCode: number): Promise<void> => {
      if (!(mergedConfig.plugins && mergedConfig.plugins.length > 0 && context)) return
      if (!afterCommandPromise) {
        afterCommandPromise = pluginManager.runAfterCommand(context, { exitCode })
      }
      await afterCommandPromise
    }

    try {
      const mergedOptions: Record<string, CLIOption<any>> = { ...GLOBAL_FLAGS, ...(command.options || {}) }
      const parsed = await parseArgs(argv, mergedOptions, command.name)
      if (providedFlags) {
        const mergeResult = await mergeProvidedFlags(command.name, mergedOptions, parsed.flags, providedFlags)
        if (mergeResult.isErr()) {
          return Result.err(mergeResult.error)
        }
        parsed.flags = mergeResult.value
      }

      if (mergedConfig.plugins && mergedConfig.plugins.length > 0) {
        const beforeResult = await pluginManager.runBeforeCommandResult(
          command.name,
          command,
          parsed.positional,
          parsed.flags
        )

        if (beforeResult.isErr()) {
          return Result.err(new CommandExecutionError({
            message: beforeResult.error.message,
            command: command.name,
            cause: beforeResult.error
          }))
        }
        context = beforeResult.value
      }

      const terminalInfo = cliDeps.getTerminalInfo()
      const rendererOptions = resolveRendererOptions(
        (resolvedConfig.tui?.renderer ?? {}) as Record<string, unknown>,
        (command.tui?.renderer ?? {}) as Record<string, unknown>
      )
      const imageOptions = resolveImageOptions(
        (resolvedConfig.tui?.image ?? {}) as Record<string, unknown>,
        (command.tui?.image ?? {}) as Record<string, unknown>,
        parsed.flags['image-mode']
      )
      const flagFormat = parsed.flags['format'] as OutputFormat | undefined
      const { format: resolvedFmt, formatExplicit, agent } = resolveOutputContext(
        terminalInfo,
        flagFormat,
        command.defaultFormat
      )
      const runtimeInfo: RuntimeInfo = {
        startTime: Date.now(),
        args: argv,
        command: invokedCommandName ?? command.name,
        outputFormat: resolvedFmt
      }
      const renderOutputAllowed = shouldRenderOutput({
        isTTY: terminalInfo.isInteractive,
        formatExplicit,
        policy: command.outputPolicy
      })
      const outputHelper = (data: unknown): void => {
        if (!renderOutputAllowed) return
        const formatted = formatOutput(data, resolvedFmt)
        if (formatted) process.stdout.write(formatted + '\n')
      }

      promptSession = cliDeps.createPromptSession()
      interruptController = createInterruptController({
        onLog: (message) => interruptLogger.debug('command=%s %s', command.name, message)
      })
      interruptController.attach()

      // Create per-run execution state for preRun/postRun hooks
      const hasPlugins = mergedConfig.plugins && mergedConfig.plugins.length > 0
      const executionState = hasPlugins ? pluginManager.createExecutionState() : undefined

      // --format forces non-TUI execution path
      const render = formatExplicit ? false : shouldUseRender(command, terminalInfo)
      const commandRunPromise = (async () => {
        // preRun hooks — immediately before handler
        if (hasPlugins && context && executionState) {
          const preRunResult = await pluginManager.runPreRunResult(context, executionState)
          if (preRunResult.isErr()) {
            throw new CommandExecutionError({
              message: preRunResult.error.message,
              command: command.name,
              cause: preRunResult.error
            })
          }
        }

        let handlerError: unknown
        try {
          if (render) {
            ensureRenderAvailable(command)
            await cliDeps.runTuiRender({
              command,
              flags: parsed.flags,
              positional: parsed.positional,
              shell: Bun.$,
              env: process.env,
              cwd: process.cwd(),
              prompt: promptSession.prompt,
              spinner: promptSession.spinner,
              colors,
              terminal: terminalInfo,
              runtime: runtimeInfo,
              signal: interruptController.signal,
              rendererOptions,
              image: imageOptions,
              format: resolvedFmt,
              formatExplicit,
              agent,
              output: outputHelper,
              ...(context ? { context } : {})
            })
          } else {
            if (!command.handler) {
              throw new CommandExecutionError({
                message: 'Command does not provide a handler for non-TUI execution',
                command: command.name,
                cause: undefined
              })
            }

            await command.handler({
              flags: parsed.flags,
              positional: parsed.positional,
              shell: Bun.$,
              env: process.env,
              cwd: process.cwd(),
              prompt: promptSession.prompt,
              spinner: promptSession.spinner,
              colors,
              terminal: terminalInfo,
              runtime: runtimeInfo,
              signal: interruptController.signal,
              image: imageOptions,
              format: resolvedFmt,
              formatExplicit,
              agent,
              output: outputHelper,
              ...(context ? { context } : {})
            })
          }
        } catch (error) {
          handlerError = error
        }

        // postRun hooks — immediately after handler (success or failure)
        if (hasPlugins && context && executionState) {
          await pluginManager.runPostRun(
            context,
            {
              exitCode: handlerError ? 1 : 0,
              ...(handlerError ? { error: handlerError } : {})
            },
            executionState
          )
        }

        if (handlerError) {
          throw handlerError
        }
      })()

      try {
        await interruptController.race(commandRunPromise)
      } catch (error) {
        if (error instanceof PromptCancelledError || error instanceof ProcessTerminatedError) {
          interruptLogger.debug('interrupt observed command=%s; waiting for in-flight work to settle', command.name)
          try {
            await commandRunPromise
          } catch (commandError) {
            interruptLogger.debug('in-flight command settled with error after interrupt command=%s: %O', command.name, commandError)
          }
        }
        throw error
      }

      await runAfterCommandOnce(0)
      return Result.ok(undefined)
    } catch (error) {
      if (error instanceof PromptCancelledError) {
        interruptLogger.debug('PromptCancelledError command=%s -> graceful-cancel', command.name)
        process.exitCode = 0
        await runAfterCommandOnce(0)
        return Result.ok(undefined)
      }

      await runAfterCommandOnce(1)

      if (
        error instanceof SchemaError ||
        error instanceof BunliValidationError ||
        error instanceof OptionValidationError
      ) {
        return Result.err(error)
      }

      if (error instanceof Error) {
        return Result.err(new CommandExecutionError({
          message: error.message,
          command: command.name,
          cause: error
        }))
      }

      return Result.err(new CommandExecutionError({
        message: String(error),
        command: command.name,
        cause: error
      }))
    } finally {
      interruptLogger.debug('dispose promptSession command=%s', command.name)
      interruptController?.detach()
      try {
        await promptSession?.dispose()
      } finally {
        disableTerminalFocusReporting()
      }
    }
  }

  async function printRunCommandError(
    error: RunCommandError,
    outputContext: OutputContext
  ): Promise<void> {
    if (outputContext.format !== 'toon') {
      writeFormatted('stderr', {
        ok: false,
        error: serializeCliError(error)
      }, outputContext.format)
      return
    }

    if (error instanceof SchemaError) {
      await renderValidationError(error)
      return
    }

    if (error instanceof BunliValidationError) {
      console.error(colors.red(`Error: ${error.message}`))
      if (error.context.hint) {
        console.error(colors.dim(`Hint: ${error.context.hint}`))
      }
      return
    }

    if (error instanceof Error) {
      console.error(colors.red(`Error: ${error.message}`))
      return
    }

    console.error(colors.red(`Error: ${String(error)}`))
  }

  const api: CLI<MergeStores<TPlugins>> = {
    command<TCommandStore = unknown>(cmd: Command<any, TCommandStore>) {
      registerCommand(cmd)
    },

    async init() {
      // Kept for lifecycle symmetry; no-op since commands are registered explicitly.
    },
    
    async run(argv = process.argv.slice(2)) {
      const terminalInfo = cliDeps.getTerminalInfo()

      if (argv.length === 0) {
        printHelpOutput(resolveOutputContext(terminalInfo), terminalInfo)
        return
      }
      
      // Handle -- separator: split args before and after --
      const separatorIndex = argv.indexOf('--')
      const commandArgs = separatorIndex >= 0 ? argv.slice(0, separatorIndex) : argv
      const passthroughArgs = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : []
      const commandLookup = stripRecognizedGlobalFlags(commandArgs)
      const { command, remainingArgs } = findCommand(commandLookup.args)
      const explicitOutputFormat = extractExplicitOutputFormat(commandArgs)

      let globalParsed: Awaited<ReturnType<typeof parseArgs>>
      try {
        globalParsed = await parseArgs(
          commandArgs,
          getGlobalFlagsForCommand(command),
          '__global__'
        )
      } catch (error) {
        await printRunCommandError(
          error as RunCommandError,
          resolveOutputContext(terminalInfo, explicitOutputFormat)
        )
        process.exit(1)
      }

      const outputContext = resolveOutputContext(
        terminalInfo,
        (globalParsed.flags['format'] as OutputFormat | undefined) ?? explicitOutputFormat
      )
      
      // Handle version flag (only check before -- separator)
      if (globalParsed.flags.version) {
        printVersion(outputContext)
        return
      }
      
      // Handle --llms and --llms-full manifest flags
      if (globalParsed.flags['llms-full']) {
        printManifestOutput(
          outputContext,
          'full',
          renderManifestFull(fullConfig.name, commands, fullConfig.description)
        )
        return
      }
      if (globalParsed.flags.llms) {
        printManifestOutput(
          outputContext,
          'compact',
          renderManifestIndex(fullConfig.name, commands, fullConfig.description)
        )
        return
      }

      // Handle help flags (only check before -- separator)
      if (globalParsed.flags.help) {
        const cmdArgs = stripRecognizedGlobalFlags(commandArgs).args
        
        if (cmdArgs.length === 0) {
          printHelpOutput(outputContext, terminalInfo)
        } else {
          const { command, remainingArgs: helpRemainingArgs } = findCommand(cmdArgs)
          if (command) {
            const matchedPath = cmdArgs.slice(0, cmdArgs.length - helpRemainingArgs.length)
            printHelpOutput(outputContext, terminalInfo, command, matchedPath.slice(0, -1))
          } else {
            const unknownCommandError = new CommandNotFoundError({
              message: `Command '${cmdArgs.join(' ')}' not found`,
              command: cmdArgs.join(' '),
              available: getAvailableCommandNames(),
            })
            await printRunCommandError(unknownCommandError, outputContext)
            process.exit(1)
          }
        }
        return
      }
      
      // Find and execute command
      if (!command) {
        const available = getAvailableCommandNames()
        const input = commandLookup.args[0] ?? ''
        const suggestion = findSuggestion(input, available)
        const error = new CommandNotFoundError({
          message: suggestion
            ? `Command '${input}' not found. Did you mean '${suggestion}'?`
            : `Command '${input}' not found`,
          command: input,
          available,
          suggestion
        })
        await printRunCommandError(error, outputContext)
        process.exit(1)
      }

      const commandOutputContext = resolveOutputContext(
        terminalInfo,
        (globalParsed.flags['format'] as OutputFormat | undefined) ?? explicitOutputFormat,
        command.defaultFormat
      )
      
      // If command has subcommands but no handler, show help
      if (!command.handler && !command.render && command.commands) {
        printHelpOutput(
          commandOutputContext,
          terminalInfo,
          command,
          commandLookup.args.slice(0, commandLookup.args.length - remainingArgs.length - 1)
        )
        return
      }
      
      // Combine remaining args from command parsing with passthrough args
      const matchedCommandLength = commandLookup.args.length - remainingArgs.length
      const matchedCommandIndexes = new Set(commandLookup.originalIndexes.slice(0, matchedCommandLength))
      const allArgs = [
        ...commandArgs.filter((_, index) => !matchedCommandIndexes.has(index)),
        ...passthroughArgs
      ]
      const invokedCommandName = commandLookup.args
        .slice(0, matchedCommandLength)
        .join(' ')
      const runResult = await runCommandInternal(command as Command<any, TStore>, allArgs, undefined, invokedCommandName || command.name)
      if (runResult.isErr()) {
        await printRunCommandError(runResult.error, commandOutputContext)
        process.exit(1)
      }
    },
    
    async execute(commandName: string, argsOrOptions?: string[] | Record<string, unknown>, options?: Record<string, unknown>) {
      // Parse command name to handle nested commands (git/sync -> git sync)
      const commandPath = commandName.replace(/\//g, ' ').split(' ')
      const { command, remainingArgs } = findCommand(commandPath)
      if (!command) {
        const available = getAvailableCommandNames()
        const suggestion = findSuggestion(commandName, available)
        throw new CommandNotFoundError({
          message: suggestion
            ? `Command '${commandName}' not found. Did you mean '${suggestion}'?`
            : `Command '${commandName}' not found`,
          command: commandName,
          available,
          suggestion
        })
      }
      
      // Handle different overload patterns
      let finalArgs: string[] = []
      let finalOptions: Record<string, unknown> = {}
      
      if (argsOrOptions && !Array.isArray(argsOrOptions)) {
        // Pattern: execute(commandName, options)
        finalOptions = argsOrOptions as Record<string, unknown>
      } else if (Array.isArray(argsOrOptions) && options) {
        // Pattern: execute(commandName, args, options)
        finalArgs = argsOrOptions
        finalOptions = options
      } else if (Array.isArray(argsOrOptions)) {
        // Pattern: execute(commandName, args)
        finalArgs = argsOrOptions
      }

      const finalArgsToUse = [...remainingArgs, ...finalArgs]
      const providedFlags = Object.keys(finalOptions).length > 0 ? finalOptions : undefined

      if (command.handler || command.render) {
        const runResult = await runCommandInternal(
          command as Command<any, TStore>,
          finalArgsToUse,
          providedFlags,
          commandName.replace(/\//g, ' ').trim()
        )
        if (runResult.isErr()) {
          throw runResult.error
        }
        return
      }

      throw new CommandExecutionError({
        message: `Command '${commandName}' cannot be executed directly`,
        command: commandName,
        cause: undefined
      })
    }
  }

  // Auto-register any generated command stores with this CLI instance
  loadGeneratedStores(api)

  return api
}
