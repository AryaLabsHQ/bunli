import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { GeneratorConfig, GeneratorEvent, CommandMetadata } from './types.js'
import { CommandScanner } from './scanner.js'
import { parseCommand } from './parser.js'
import { buildTypes } from './builder.js'

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
      const command = await parseCommand(file, this.config.commandsDir)
      if (command) {
        commands.push(command)
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
