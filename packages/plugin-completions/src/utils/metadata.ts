import type { GeneratedCommandMeta } from '@bunli/core'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import type { CompletionsPluginOptions } from '../types.js'

export interface ResolvedCliInfo {
  commandName: string
  executable: string
}

export interface LoadedCommandMetadata {
  commands: GeneratedCommandMeta[]
}

function stripScope(name: string): string {
  // "@scope/name" -> "name"
  const idx = name.lastIndexOf('/')
  return idx >= 0 ? name.slice(idx + 1) : name
}

export async function resolveCliInfo(options: CompletionsPluginOptions = {}): Promise<ResolvedCliInfo> {
  if (options.commandName && options.executable) {
    return { commandName: options.commandName, executable: options.executable }
  }

  let pkg: any | null = null
  try {
    const pkgPath = resolve(process.cwd(), 'package.json')
    const pkgContent = await readFile(pkgPath, 'utf-8')
    pkg = JSON.parse(pkgContent)
  } catch {
    pkg = null
  }

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
): Promise<LoadedCommandMetadata> {
  const generatedPath = options.generatedPath ?? '.bunli/commands.gen.ts'
  const absolute = resolve(process.cwd(), generatedPath)

  // Bun/Node dynamic import of absolute paths is most reliable via file: URL.
  const url = pathToFileURL(absolute).href

  try {
    const mod = (await import(url)) as {
      generated?: { list: () => Array<{ metadata: GeneratedCommandMeta }> }
    }
    const list = mod.generated?.list?.() ?? []
    return { commands: list.map((i) => i.metadata) }
  } catch (error) {
    throw new Error(
      `Could not load command metadata from ${generatedPath}. Make sure it exists (run "bunli generate").`
    )
  }
}

