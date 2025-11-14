import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import debug from 'debug'
import type { GeneratorConfig, GeneratorEvent, CommandMetadata } from './types.js'
import { CommandScanner } from './scanner.js'
import { parseCommand } from './parser.js'
import { buildTypes } from './builder.js'

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
  async run(event?: GeneratorEvent): Promise<void> {
    try {
      // 1. Scan for command files
      const commandFiles = await this.scanCommands()
      
      // 2. Parse each command file
      const commands = await this.parseCommands(commandFiles)
      
      // 3. Build TypeScript types
      const typesContent = buildTypes(commands)
      
      // 4. Write to output file
      await this.writeTypes(typesContent)

      // 5. Emit a simple report alongside the types for diagnostics (if enabled)
      if (this.config.generateReport) {
        const report = {
          commandsParsed: commands.length,
          filesScanned: commandFiles.length,
          skipped: commandFiles.filter(f => !commands.some(c => c.filePath === f)),
          names: commands.map(c => c.name).sort()
        }
        await this.writeReport(report)
      }
      
      console.log(`✓ Generated types for ${commands.length} commands`)
    } catch (error) {
      console.error('Failed to generate types:', error)
      throw error
    }
  }

  /**
   * Scan for command files in the commands directory
   */
  private async scanCommands(): Promise<string[]> {
    return await this.scanner.scanCommands(this.config.commandsDir)
  }

  /**
   * Parse command files to extract metadata
   */
  private async parseCommands(files: string[]): Promise<CommandMetadata[]> {
    const commands: CommandMetadata[] = []

    for (const file of files) {
      log(`Parsing file: ${file}`)
      const command = await parseCommand(file, this.config.commandsDir, this.config.outputFile)
      if (command) {
        log(`✅ Successfully parsed: ${command.name}`)
        commands.push(command)
      } else {
        log(`❌ Failed to parse: ${file}`)
      }
    }

    return commands
  }

  /**
   * Write generated types to the output file
   */
  private async writeTypes(content: string): Promise<void> {
    // Ensure output directory exists
    const outputDir = dirname(this.config.outputFile)
    await mkdir(outputDir, { recursive: true })

    // Use Bun's native file writing
    await Bun.write(this.config.outputFile, content)
  }

  /**
   * Write generation report next to the output file
   */
  private async writeReport(report: any): Promise<void> {
    const reportPath = this.config.outputFile.replace(/\.ts$/, '.report.json')
    await Bun.write(reportPath, JSON.stringify(report, null, 2))
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
