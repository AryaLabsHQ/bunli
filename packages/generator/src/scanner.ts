import { join, relative, extname } from 'node:path'
import { Result } from 'better-result'
import type { CommandMetadata } from './types.js'
import { createLogger } from '@bunli/core/utils'
import { ScanCommandFileError, ScanCommandsError } from './errors.js'

const logger = createLogger('generator:scanner')

function isMissingDirectoryError(cause: unknown): boolean {
  return cause instanceof Error && (cause as NodeJS.ErrnoException).code === 'ENOENT'
}

/**
 * Fast command scanner using Bun.Transpiler for optimal performance
 * 
 * This scanner uses Bun's native transpiler to quickly identify
 * command files without full AST parsing, making it much faster
 * than traditional approaches.
 */
export class CommandScanner {
  private transpiler: Bun.Transpiler

  constructor() {
    // Initialize transpiler for TypeScript/JSX files
    this.transpiler = new Bun.Transpiler({ 
      loader: 'tsx',
      target: 'bun'
    })
  }

  /**
   * Scan for command files using Bun.Transpiler for fast filtering
   */
  async scanCommands(commandsDir: string): Promise<Result<string[], ScanCommandsError>> {
    // Use Bun's native Glob for file scanning
    const glob = new Bun.Glob('**/*.{ts,tsx,js,jsx}')
    const filesResult = await Result.tryPromise({
      try: async () => Array.fromAsync(glob.scan({ cwd: commandsDir })),
      catch: (cause) => cause
    })

    if (Result.isError(filesResult)) {
      if (isMissingDirectoryError(filesResult.error)) {
        logger.debug('Commands directory %s does not exist; treating as empty', commandsDir)
        return Result.ok([])
      }

      const error = new ScanCommandsError({
        commandsDir,
        message: `Could not scan commands directory ${commandsDir}`,
        cause: filesResult.error
      })
      logger.debug('Could not scan commands directory %s: %O', commandsDir, error)
      return Result.err(error)
    }

    const files = filesResult.value
    const commandFiles: string[] = []

    // Process files in parallel for better performance
    const fileChecks = files.map(async (file) => {
      const fullPath = join(commandsDir, file)

      // Quick file extension check
      const ext = extname(file)
      if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        return null
      }

      // Skip test files and other non-command files
      if (this.isNonCommandFile(file)) {
        return null
      }

      // Use Bun.Transpiler to quickly check if this is a command file
      const fileResult = await this.isCommandFile(fullPath)
      if (Result.isError(fileResult)) {
        logger.debug('Could not inspect command file %s: %O', fullPath, fileResult.error)
        return null
      }

      if (fileResult.value) {
        return fullPath
      }

      return null
    })

    const results = await Promise.all(fileChecks)

    // Filter out null results
    for (const result of results) {
      if (result) {
        commandFiles.push(result)
      }
    }

    return Result.ok(commandFiles)
  }

  /**
   * Check if a file is likely a command file using Bun.Transpiler
   */
  private async isCommandFile(filePath: string): Promise<Result<boolean, ScanCommandFileError>> {
    return Result.tryPromise({
      try: async () => {
        const file = Bun.file(filePath)
        const content = await file.text()

        // Use Bun.Transpiler to quickly scan for command indicators
        const scanResult = this.transpiler.scan(content)

        // Check for command-related exports
        const hasCommandExport = scanResult.exports.some(exp =>
          exp === 'default' ||
          exp.includes('Command') ||
          exp.includes('defineCommand')
        )

        // Check for command-related imports
        const hasCommandImports = scanResult.imports.some(imp =>
          imp.path.includes('@bunli/core') ||
          imp.path.includes('defineCommand')
        )

        // Check for defineCommand usage in the content
        const hasDefineCommand = content.includes('defineCommand(')

        return hasCommandExport && (hasCommandImports || hasDefineCommand)
      },
      catch: (cause) =>
        new ScanCommandFileError({
          filePath,
          message: `Could not inspect command file ${filePath}`,
          cause
        })
    })
  }

  /**
   * Check if a file should be excluded from command scanning
   */
  private isNonCommandFile(fileName: string): boolean {
    return (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.includes('__tests__') ||
      fileName.includes('node_modules') ||
      fileName.includes('dist') ||
      fileName.includes('.bunli') ||
      fileName.includes('.d.ts') ||
      fileName.includes('.config.') ||
      fileName.includes('.setup.') ||
      fileName.includes('commands.gen.')
    )
  }

  /**
   * Get command name from file path
   */
  getCommandName(filePath: string, commandsDir: string): string {
    const relativePath = filePath.replace(commandsDir + '/', '')
    const withoutExt = relativePath.replace(/\.[^.]+$/, '')
    
    // Handle index files as parent commands
    if (withoutExt.endsWith('/index')) {
      return withoutExt.slice(0, -6) // Remove '/index'
    }
    
    return withoutExt
  }

  /**
   * Get export path for a command file
   */
  getExportPath(filePath: string, commandsDir: string): string {
    const relativePath = filePath.replace(commandsDir + '/', '')
    const withoutExt = relativePath.replace(/\.[^.]+$/, '')
    return `./commands/${withoutExt}`
  }
}

// Utility functions for external use
export function isCommandFile(filePath: string): boolean {
  const ext = extname(filePath)
  return ['.ts', '.tsx', '.js', '.jsx'].includes(ext) &&
         !filePath.includes('.test.') &&
         !filePath.includes('.spec.') &&
         !filePath.includes('__tests__') &&
         !filePath.includes('commands.gen.') &&
         !filePath.includes('.bunli/')
}
