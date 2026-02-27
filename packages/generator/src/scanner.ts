import { dirname, extname, join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { parse } from '@babel/parser'
const traverse = require('@babel/traverse').default
import { Result } from 'better-result'
import { createLogger } from '@bunli/core/utils'
import { ScanCommandFileError, ScanCommandsError } from './errors.js'

const logger = createLogger('generator:scanner')

const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

function isMissingDirectoryError(cause: unknown): boolean {
  return cause instanceof Error && (cause as NodeJS.ErrnoException).code === 'ENOENT'
}

/**
 * Command scanner that prefers entrypoint-based command discovery.
 *
 * Primary path:
 * - Parse the CLI entry file
 * - Collect modules passed to `cli.command(...)`
 *
 * Fallback path:
 * - Scan `directory` when entrypoint analysis discovers no command modules
 */
export class CommandScanner {
  private transpiler: Bun.Transpiler

  constructor() {
    this.transpiler = new Bun.Transpiler({
      loader: 'tsx',
      target: 'bun'
    })
  }

  async scanCommands(entry: string, directory?: string): Promise<Result<string[], ScanCommandsError>> {
    const resolvedEntry = resolve(entry)
    if (!existsSync(resolvedEntry)) {
      return Result.err(new ScanCommandsError({
        entry: resolvedEntry,
        message: `Entry file does not exist: ${resolvedEntry}`,
        cause: new Error('Entry file not found')
      }))
    }

    const fromEntry = await this.scanFromEntry(resolvedEntry)
    if (Result.isError(fromEntry)) {
      return Result.err(new ScanCommandsError({
        entry: resolvedEntry,
        message: `Could not scan commands from entry ${resolvedEntry}`,
        cause: fromEntry.error
      }))
    }

    if (fromEntry.value.length > 0) {
      return Result.ok(fromEntry.value)
    }

    const fallbackDirectory = resolve(directory ?? 'commands')
    const fromDirectory = await this.scanDirectory(fallbackDirectory)
    if (Result.isError(fromDirectory)) {
      if (isMissingDirectoryError(fromDirectory.error.cause)) {
        logger.debug(
          'No command registrations found in %s and fallback directory %s is missing; treating as empty',
          resolvedEntry,
          fallbackDirectory
        )
        return Result.ok([])
      }

      return Result.err(new ScanCommandsError({
        entry: resolvedEntry,
        message: `Could not scan fallback commands directory ${fallbackDirectory}`,
        cause: fromDirectory.error
      }))
    }

    return Result.ok(fromDirectory.value)
  }

  private async scanFromEntry(entryFile: string): Promise<Result<string[], ScanCommandFileError>> {
    const visited = new Set<string>()
    const queued = new Set<string>()
    const commandFiles = new Set<string>()
    const queue: string[] = [entryFile]
    queued.add(entryFile)

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) continue
      if (visited.has(current)) continue
      visited.add(current)

      const inspectResult = await this.inspectModule(current)
      if (Result.isError(inspectResult)) {
        return Result.err(inspectResult.error)
      }

      const {
        importMap,
        localRelativeImports,
        registeredCommandIdentifiers,
        localIdentifierAliases,
        locallyDefinedCommandIdentifiers,
        hasDefaultExport
      } = inspectResult.value

      for (const identifier of registeredCommandIdentifiers) {
        const resolved = this.resolveRegisteredCommandTarget(
          identifier,
          importMap,
          localIdentifierAliases,
          locallyDefinedCommandIdentifiers
        )
        if (!resolved) continue
        if (resolved === 'current') {
          if (hasDefaultExport) {
            commandFiles.add(current)
          }
        } else {
          commandFiles.add(resolved)
        }
      }

      for (const importedFile of localRelativeImports) {
        if (visited.has(importedFile) || queued.has(importedFile)) continue
        queue.push(importedFile)
        queued.add(importedFile)
      }
    }

    return Result.ok(Array.from(commandFiles).sort((a, b) => a.localeCompare(b)))
  }

  private async inspectModule(filePath: string): Promise<Result<{
    importMap: Map<string, string>
    localRelativeImports: Set<string>
    registeredCommandIdentifiers: Set<string>
    localIdentifierAliases: Map<string, string>
    locallyDefinedCommandIdentifiers: Set<string>
    hasDefaultExport: boolean
  }, ScanCommandFileError>> {
    return Result.tryPromise({
      try: async () => {
        const content = await Bun.file(filePath).text()
        const scanResult = this.transpiler.scan(content)
        const ast = parse(content, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx', 'decorators-legacy']
        })

        const importMap = new Map<string, string>()
        const localRelativeImports = new Set<string>()
        const registeredCommandIdentifiers = new Set<string>()
        const localIdentifierAliases = new Map<string, string>()
        const locallyDefinedCommandIdentifiers = new Set<string>()
        const hasDefaultExport = scanResult.exports.includes('default')

        traverse(ast, {
          ImportDeclaration: (path: any) => {
            const source = path.node.source?.value
            if (typeof source !== 'string' || !source.startsWith('.')) return
            const resolved = this.resolveImportPath(filePath, source)
            if (!resolved) return

            localRelativeImports.add(resolved)
            for (const specifier of path.node.specifiers) {
              if (!specifier?.local?.name) continue
              importMap.set(specifier.local.name, resolved)
            }
          },
          VariableDeclarator: (path: any) => {
            const id = path.node.id
            const init = path.node.init
            if (!id || id.type !== 'Identifier' || !init) return

            if (init.type === 'Identifier') {
              localIdentifierAliases.set(id.name, init.name)
              return
            }

            if (
              init.type === 'CallExpression' &&
              this.isCommandFactoryCall(init)
            ) {
              locallyDefinedCommandIdentifiers.add(id.name)
            }
          },
          CallExpression: (path: any) => {
            const callee = path.node.callee
            if (
              callee?.type !== 'MemberExpression' ||
              callee.property?.type !== 'Identifier' ||
              callee.property.name !== 'command'
            ) {
              return
            }

            const firstArg = path.node.arguments?.[0]
            if (!firstArg) return

            if (firstArg.type === 'Identifier') {
              registeredCommandIdentifiers.add(firstArg.name)
            }
          }
        })

        return {
          importMap,
          localRelativeImports,
          registeredCommandIdentifiers,
          localIdentifierAliases,
          locallyDefinedCommandIdentifiers,
          hasDefaultExport
        }
      },
      catch: (cause) => new ScanCommandFileError({
        filePath,
        message: `Could not inspect module ${filePath}`,
        cause
      })
    })
  }

  private async scanDirectory(commandsDirectory: string): Promise<Result<string[], ScanCommandsError>> {
    const glob = new Bun.Glob('**/*.{ts,tsx,js,jsx,mjs,cjs}')
    const filesResult = await Result.tryPromise({
      try: async () => Array.fromAsync(glob.scan({ cwd: commandsDirectory })),
      catch: (cause) => cause
    })

    if (Result.isError(filesResult)) {
      return Result.err(new ScanCommandsError({
        entry: commandsDirectory,
        message: `Could not scan commands directory ${commandsDirectory}`,
        cause: filesResult.error
      }))
    }

    const commandFiles: string[] = []
    const checks = filesResult.value.map(async (file) => {
      const fullPath = join(commandsDirectory, file)
      const ext = extname(file)
      if (!SUPPORTED_EXTENSIONS.includes(ext)) return null
      if (this.isNonCommandFile(file)) return null

      const fileResult = await this.isCommandFile(fullPath)
      if (Result.isError(fileResult)) {
        logger.debug('Could not inspect potential command file %s: %O', fullPath, fileResult.error)
        return null
      }

      return fileResult.value ? fullPath : null
    })

    const results = await Promise.all(checks)
    for (const file of results) {
      if (file) commandFiles.push(file)
    }

    return Result.ok(commandFiles.sort((a, b) => a.localeCompare(b)))
  }

  private resolveRegisteredCommandTarget(
    identifier: string,
    importMap: Map<string, string>,
    localIdentifierAliases: Map<string, string>,
    locallyDefinedCommandIdentifiers: Set<string>
  ): string | 'current' | undefined {
    let current = identifier
    const seen = new Set<string>()

    while (true) {
      if (locallyDefinedCommandIdentifiers.has(current)) {
        return 'current'
      }

      const imported = importMap.get(current)
      if (imported) {
        return imported
      }

      if (seen.has(current)) {
        return undefined
      }
      seen.add(current)

      const alias = localIdentifierAliases.get(current)
      if (!alias) {
        return undefined
      }
      current = alias
    }
  }

  private isCommandFactoryCall(node: any): boolean {
    if (!node || node.type !== 'CallExpression') return false
    const callee = node.callee
    if (callee?.type === 'Identifier') {
      return callee.name === 'defineCommand' || callee.name === 'defineGroup'
    }
    if (callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier') {
      return callee.property.name === 'defineCommand' || callee.property.name === 'defineGroup'
    }
    return false
  }

  private async isCommandFile(filePath: string): Promise<Result<boolean, ScanCommandFileError>> {
    return Result.tryPromise({
      try: async () => {
        const content = await Bun.file(filePath).text()
        const scanResult = this.transpiler.scan(content)

        const hasCommandExport = scanResult.exports.some(exp => exp === 'default' || exp.includes('Command') || exp.includes('Group'))
        const hasCoreImport = scanResult.imports.some(imp => imp.path.includes('@bunli/core'))
        const hasCommandCall = content.includes('defineCommand(') || content.includes('defineGroup(')

        return hasCommandCall && (hasCommandExport || hasCoreImport)
      },
      catch: (cause) => new ScanCommandFileError({
        filePath,
        message: `Could not inspect command file ${filePath}`,
        cause
      })
    })
  }

  private resolveImportPath(fromFile: string, specifier: string): string | null {
    const base = resolve(dirname(fromFile), specifier)
    const candidatePaths: string[] = []

    const extension = extname(base)
    if (extension) {
      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        return null
      }

      candidatePaths.push(base)

      if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
        const stem = base.slice(0, -extension.length)
        for (const ext of SUPPORTED_EXTENSIONS) {
          candidatePaths.push(`${stem}${ext}`)
        }
      }
    } else {
      for (const ext of SUPPORTED_EXTENSIONS) {
        candidatePaths.push(`${base}${ext}`)
      }
      for (const ext of SUPPORTED_EXTENSIONS) {
        candidatePaths.push(join(base, `index${ext}`))
      }
    }

    for (const candidate of candidatePaths) {
      if (existsSync(candidate)) return candidate
    }

    return null
  }

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
}

export function isCommandFile(filePath: string): boolean {
  const ext = extname(filePath)
  return SUPPORTED_EXTENSIONS.includes(ext) &&
    !filePath.includes('.test.') &&
    !filePath.includes('.spec.') &&
    !filePath.includes('__tests__') &&
    !filePath.includes('commands.gen.') &&
    !filePath.includes('.bunli/')
}
