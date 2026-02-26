import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import debug from 'debug'
import { Result } from 'better-result'
import type { GeneratorConfig, GeneratorEvent, CommandMetadata } from './types.js'
import { CommandScanner } from './scanner.js'
import { parseCommand } from './parser.js'
import { buildTypes } from './builder.js'
import {
  GeneratorRunError,
  ParseCommandError,
  WriteReportError,
  WriteTypesError
} from './errors.js'

const log = debug('bunli:generator')

export class Generator {
  private config: GeneratorConfig
  private scanner: CommandScanner

  constructor(config: GeneratorConfig) {
    this.config = config
    this.scanner = new CommandScanner()
  }

  /**
   * Run the generator to create or update command types
   */
  async run(event?: GeneratorEvent): Promise<Result<void, GeneratorRunError>> {
    // 1. Scan for command files
    const commandFilesResult = await this.scanCommands()
    if (Result.isError(commandFilesResult)) {
      return Result.err(
        new GeneratorRunError({
          message: `Failed to scan commands from ${this.config.commandsDir}`,
          cause: commandFilesResult.error
        })
      )
    }
    const commandFiles = commandFilesResult.value

    // 2. Parse each command file
    const { commands, parseErrors } = await this.parseCommands(commandFiles)
    if (parseErrors.length > 0) {
      console.warn(
        `Skipped ${parseErrors.length} command file(s) due to parser errors while generating types.`
      )
    }

    // 3. Build TypeScript types
    const typesContent = buildTypes(commands)

    // 4. Write to output file
    const writeTypesResult = await this.writeTypes(typesContent)
    if (Result.isError(writeTypesResult)) {
      return Result.err(
        new GeneratorRunError({
          message: `Failed to write generated types to ${this.config.outputFile}`,
          cause: writeTypesResult.error
        })
      )
    }

    // 5. Emit a simple report alongside the types for diagnostics (if enabled)
    if (this.config.generateReport) {
      const report = {
        commandsParsed: commands.length,
        filesScanned: commandFiles.length,
        skipped: commandFiles.filter(f => !commands.some(c => c.filePath === f)),
        parseErrors: parseErrors.map(error => ({ filePath: error.filePath, message: error.message })),
        names: commands.map(c => c.name).sort()
      }
      const writeReportResult = await this.writeReport(report)
      if (Result.isError(writeReportResult)) {
        return Result.err(
          new GeneratorRunError({
            message: `Failed to write generation report for ${this.config.outputFile}`,
            cause: writeReportResult.error
          })
        )
      }
    }

    console.log(`✓ Generated types for ${commands.length} commands`)
    return Result.ok()
  }

  /**
   * Scan for command files in the commands directory
   */
  private async scanCommands() {
    return await this.scanner.scanCommands(this.config.commandsDir)
  }

  /**
   * Parse command files to extract metadata
   */
  private async parseCommands(
    files: string[]
  ): Promise<{ commands: CommandMetadata[]; parseErrors: ParseCommandError[] }> {
    const commands: CommandMetadata[] = []
    const parseErrors: ParseCommandError[] = []

    for (const file of files) {
      log(`Parsing file: ${file}`)
      const commandResult = await parseCommand(file, this.config.commandsDir, this.config.outputFile)
      if (Result.isError(commandResult)) {
        parseErrors.push(commandResult.error)
        log(`❌ Failed to parse: ${file}`)
        continue
      }

      const command = commandResult.value
      if (command) {
        log(`✅ Successfully parsed: ${command.name}`)
        commands.push(command)
      } else {
        log(`❌ Failed to parse: ${file}`)
      }
    }

    return { commands, parseErrors }
  }

  /**
   * Write generated types to the output file
   */
  private async writeTypes(content: string): Promise<Result<void, WriteTypesError>> {
    return Result.tryPromise({
      try: async () => {
        // Ensure output directory exists
        const outputDir = dirname(this.config.outputFile)
        await mkdir(outputDir, { recursive: true })

        // Use Bun's native file writing
        await Bun.write(this.config.outputFile, content)
      },
      catch: (cause) =>
        new WriteTypesError({
          outputFile: this.config.outputFile,
          message: `Could not write generated types to ${this.config.outputFile}`,
          cause
        })
    })
  }

  /**
   * Write generation report next to the output file
   */
  private async writeReport(report: unknown): Promise<Result<void, WriteReportError>> {
    const reportPath = this.config.outputFile.replace(/\.ts$/, '.report.json')
    return Result.tryPromise({
      try: async () => {
        await Bun.write(reportPath, JSON.stringify(report, null, 2))
      },
      catch: (cause) =>
        new WriteReportError({
          reportFile: reportPath,
          message: `Could not write generator report to ${reportPath}`,
          cause
        })
    })
  }

  /**
   * Get the current configuration
   */
  getConfig(): GeneratorConfig {
    return { ...this.config }
  }

  /**
   * Update the configuration
   */
  updateConfig(updates: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}
