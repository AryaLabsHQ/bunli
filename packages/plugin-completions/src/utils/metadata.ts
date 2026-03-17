import type { GeneratedCommandMeta } from '@bunli/core'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { Result, TaggedError } from 'better-result'
import type { CompletionsPluginOptions } from '../types.js'

export interface ResolvedCliInfo {
  commandName: string
  executable: string
}

export interface LoadedCommandMetadata {
  commands: GeneratedCommandMeta[]
}

class PackageJsonReadError extends TaggedError('PackageJsonReadError')<{
  message: string
  cause: unknown
}>() {}

export class LoadGeneratedMetadataError extends TaggedError('LoadGeneratedMetadataError')<{
  generatedPath: string
  message: string
  cause: unknown
}>() {}

function stripScope(name: string): string {
  // "@scope/name" -> "name"
  const idx = name.lastIndexOf('/')
  return idx >= 0 ? name.slice(idx + 1) : name
}

export async function resolveCliInfo(options: CompletionsPluginOptions = {}): Promise<ResolvedCliInfo> {
  if (options.commandName && options.executable) {
    return { commandName: options.commandName, executable: options.executable }
  }

  const packageJsonResult = await readProjectPackageJson()
  const pkg = Result.isOk(packageJsonResult) ? packageJsonResult.value : null

  const pkgName: string | undefined = typeof pkg?.name === 'string' ? pkg.name : undefined
  const pkgNameStripped = pkgName ? stripScope(pkgName) : undefined

  let inferredCommandName: string | undefined
  const bin = pkg?.bin
  if (typeof bin === 'string') {
    // No bin key; fall back to package name.
    inferredCommandName = pkgNameStripped
  } else if (bin && typeof bin === 'object') {
    const keys = Object.keys(bin)
    if (pkgNameStripped && keys.includes(pkgNameStripped)) inferredCommandName = pkgNameStripped
    else inferredCommandName = keys[0]
    if (inferredCommandName) inferredCommandName = stripScope(inferredCommandName)
  } else {
    inferredCommandName = pkgNameStripped
  }

  const commandName = options.commandName ?? inferredCommandName ?? 'cli'
  const executable = options.executable ?? commandName
  return { commandName, executable }
}

export async function loadGeneratedMetadata(
  options: CompletionsPluginOptions = {}
): Promise<Result<LoadedCommandMetadata, LoadGeneratedMetadataError>> {
  const generatedPath = options.generatedPath ?? '.bunli/commands.gen.ts'
  const absolute = resolve(process.cwd(), generatedPath)

  // Bun/Node dynamic import of absolute paths is most reliable via file: URL.
  const url = pathToFileURL(absolute).href

  return await Result.tryPromise({
    try: async () => {
      const mod = (await import(url)) as {
        generated?: { list: () => Array<{ metadata: GeneratedCommandMeta }> }
      }
      const list = mod.generated?.list?.() ?? []
      return { commands: list.map((i) => i.metadata) }
    },
    catch: (cause) =>
      new LoadGeneratedMetadataError({
        generatedPath,
        message: `Could not load command metadata from ${generatedPath}. Make sure it exists (run "bunli generate").`,
        cause
      })
  })
}

async function readProjectPackageJson(): Promise<Result<Record<string, unknown>, PackageJsonReadError>> {
  return Result.tryPromise({
    try: async () => {
      const pkgPath = resolve(process.cwd(), 'package.json')
      const pkgContent = await readFile(pkgPath, 'utf-8')
      const parsed = JSON.parse(pkgContent)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('package.json must be a JSON object')
      }
      return parsed as Record<string, unknown>
    },
    catch: (cause) =>
      new PackageJsonReadError({
        message: 'Could not read project package.json',
        cause
      })
  })
}
