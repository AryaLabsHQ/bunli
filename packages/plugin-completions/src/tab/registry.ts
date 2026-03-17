import { GLOBAL_FLAGS } from '@bunli/core'
import type { GeneratedCommandMeta, GeneratedOptionMeta } from '@bunli/core'
import { RootCommand, type Command as TabCommand, type OptionHandler } from '@bomb.sh/tab'

export interface RegistryOptions {
  includeAliases: boolean
  includeGlobalFlags: boolean
}

function canonicalCommandPath(name: string): string {
  return name
    .replace(/\s+/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .trim()
}

function resolveNestedCommandName(parentPath: string | undefined, rawName: string): string {
  const child = canonicalCommandPath(rawName)
  if (!child) return parentPath ?? ''
  if (!parentPath) return child

  if (!child.includes('/')) {
    return `${parentPath}/${child}`
  }

  if (child === parentPath || child.startsWith(`${parentPath}/`)) {
    return child
  }

  // Treat already nested path-like names as explicit paths.
  return child
}

function flattenCommandTree(commands: GeneratedCommandMeta[]): GeneratedCommandMeta[] {
  const flattened: GeneratedCommandMeta[] = []

  const walk = (meta: GeneratedCommandMeta, parentPath?: string) => {
    const resolvedName = resolveNestedCommandName(parentPath, meta.name)
    if (!resolvedName) return

    flattened.push({
      ...meta,
      name: resolvedName
    })

    for (const nested of meta.commands ?? []) {
      walk(nested, resolvedName)
    }
  }

  for (const meta of commands) {
    walk(meta)
  }

  return flattened
}

function normalizeCommandPath(name: string): string {
  // Bunli generator uses "/" to represent nested commands; Tab expects space-separated paths.
  return name.replace(/\//g, ' ').trim()
}

function isBooleanOption(meta: GeneratedOptionMeta): boolean {
  const t = meta.type.toLowerCase()
  return t.includes('boolean') || t.includes('bool')
}

function addGlobalFlags(cmd: TabCommand) {
  for (const [name, flag] of Object.entries(GLOBAL_FLAGS)) {
    const desc = flag.description ?? ''
    const short = 'short' in flag ? flag.short : undefined
    if (short) cmd.option(name, desc, short)
    else cmd.option(name, desc)
  }
}

function addOption(cmd: TabCommand, name: string, meta: GeneratedOptionMeta) {
  const desc = meta.description ?? ''
  const short = meta.short

  if (isBooleanOption(meta)) {
    if (short) cmd.option(name, desc, short)
    else cmd.option(name, desc)
    return
  }

  const enumValues = meta.enumValues
  const literalValue = meta.literalValue

  const handler: OptionHandler = (complete) => {
    if (enumValues && enumValues.length > 0) {
      for (const v of enumValues) complete(String(v), '')
      return
    }
    if (literalValue !== undefined) {
      complete(String(literalValue), '')
    }
    // Otherwise: no suggestions, but handler marks the option as value-taking.
  }

  if (short) cmd.option(name, desc, handler, short)
  else cmd.option(name, desc, handler)
}

function addCommandOptions(cmd: TabCommand, meta: GeneratedCommandMeta) {
  for (const [name, opt] of Object.entries(meta.options ?? {})) {
    addOption(cmd, name, opt)
  }
}

function expandAliases(meta: GeneratedCommandMeta, opts: RegistryOptions): string[] {
  const primary = normalizeCommandPath(meta.name)
  if (!opts.includeAliases || !meta.alias) return [primary]

  const aliases = Array.isArray(meta.alias) ? meta.alias : [meta.alias]
  const parts = primary.split(' ').filter(Boolean)
  const parent = parts.slice(0, -1)

  const expanded: string[] = [primary]
  for (const a of aliases) {
    const aliasRaw = String(a).trim()
    if (!aliasRaw) continue

    // If alias looks like a full path, take it as-is (after normalization).
    if (aliasRaw.includes('/') || aliasRaw.includes(' ')) {
      expanded.push(normalizeCommandPath(aliasRaw))
      continue
    }

    // Otherwise, treat alias as leaf name.
    expanded.push([...parent, aliasRaw].join(' ').trim())
  }

  return expanded
}

export function buildRegistry(
  commands: GeneratedCommandMeta[],
  options: Partial<RegistryOptions> = {}
): RootCommand {
  const opts: RegistryOptions = {
    includeAliases: options.includeAliases ?? true,
    includeGlobalFlags: options.includeGlobalFlags ?? true
  }

  const root = new RootCommand()
  const flattenedCommands = flattenCommandTree(commands)

  const metaByPath = new Map<string, GeneratedCommandMeta>()
  const allPaths = new Set<string>()

  for (const meta of flattenedCommands) {
    for (const path of expandAliases(meta, opts)) {
      metaByPath.set(path, meta)

      const parts = path.split(' ').filter(Boolean)
      for (let i = 1; i <= parts.length; i += 1) {
        allPaths.add(parts.slice(0, i).join(' '))
      }
    }
  }

  // Ensure stable, predictable descriptions by registering shorter paths first.
  const sortedPaths = Array.from(allPaths).sort((a, b) => {
    const al = a.split(' ').length
    const bl = b.split(' ').length
    if (al !== bl) return al - bl
    return a.localeCompare(b)
  })

  const tabCommands = new Map<string, TabCommand>()

  for (const path of sortedPaths) {
    const meta = metaByPath.get(path)
    const desc = meta?.description ?? ''
    const cmd = root.command(path, desc)
    tabCommands.set(path, cmd)

    if (opts.includeGlobalFlags) addGlobalFlags(cmd)
    if (meta) addCommandOptions(cmd, meta)
  }

  if (opts.includeGlobalFlags) addGlobalFlags(root)

  return root
}
