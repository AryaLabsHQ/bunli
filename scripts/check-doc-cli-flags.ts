import path from 'node:path'
import { readFile } from 'node:fs/promises'
import * as ts from 'typescript'

type CommandSpec = {
  name: string
  file: string
  flags: Set<string>
}

async function listDocFiles(): Promise<string[]> {
  const globs = [
    'apps/web/content/docs/**/*.mdx',
    'packages/*/README.md',
    'README.md',
  ]

  const files = new Set<string>()
  for (const pattern of globs) {
    for await (const p of new Bun.Glob(pattern).scan({ dot: true })) {
      files.add(p)
    }
  }
  return [...files].sort()
}

async function listCommandFiles(): Promise<string[]> {
  const files: string[] = []
  for await (const p of new Bun.Glob('packages/cli/src/commands/*.ts').scan({ dot: true })) {
    files.push(p)
  }
  return files.sort()
}

function isDefineCommandCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineCommand'
}

function getObjectProp(obj: ts.ObjectLiteralExpression, name: string): ts.ObjectLiteralElementLike | undefined {
  return obj.properties.find((p) => {
    if (!ts.isPropertyAssignment(p)) return false
    const n = p.name
    if (!n) return false
    if (ts.isIdentifier(n)) return n.text === name
    if (ts.isStringLiteral(n)) return n.text === name
    return false
  })
}

function getStringPropValue(obj: ts.ObjectLiteralExpression, name: string): string | null {
  const prop = getObjectProp(obj, name)
  if (!prop || !ts.isPropertyAssignment(prop)) return null
  const init = prop.initializer
  if (ts.isStringLiteral(init)) return init.text
  return null
}

function collectOptionKeys(optionsObj: ts.ObjectLiteralExpression): Set<string> {
  const keys = new Set<string>()
  for (const p of optionsObj.properties) {
    if (!ts.isPropertyAssignment(p)) continue
    const n = p.name
    if (!n) continue
    if (ts.isIdentifier(n)) keys.add(n.text)
    else if (ts.isStringLiteral(n)) keys.add(n.text)
  }
  return keys
}

async function loadCommands(): Promise<Map<string, CommandSpec>> {
  const repoRoot = process.cwd()
  const commandFiles = await listCommandFiles()

  const byName = new Map<string, CommandSpec>()

  for (const relPath of commandFiles) {
    const absPath = path.join(repoRoot, relPath)
    const text = await readFile(absPath, 'utf8')
    const sf = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

    let found: { name: string; flags: Set<string> } | null = null

    const visit = (node: ts.Node) => {
      if (isDefineCommandCall(node)) {
        const arg = node.arguments[0]
        if (arg && ts.isObjectLiteralExpression(arg)) {
          const name = getStringPropValue(arg, 'name')
          const optionsProp = getObjectProp(arg, 'options')
          const flags = new Set<string>()
          if (optionsProp && ts.isPropertyAssignment(optionsProp) && ts.isObjectLiteralExpression(optionsProp.initializer)) {
            for (const k of collectOptionKeys(optionsProp.initializer)) flags.add(k)
          }

          if (name) {
            found = { name, flags }
          }
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(sf)

    if (!found) continue
    byName.set(found.name, { name: found.name, file: relPath, flags: found.flags })
  }

  return byName
}

type FlagUse = {
  docFile: string
  line: number
  command: string
  flag: string
  text: string
}

async function main() {
  const repoRoot = process.cwd()
  const allow = new Set(['help', 'version'])
  const passThrough = new Set(['dev'])
  const commands = await loadCommands()
  const docFiles = await listDocFiles()

  const unknownUses: FlagUse[] = []

  for (const relPath of docFiles) {
    const absPath = path.join(repoRoot, relPath)
    const text = await readFile(absPath, 'utf8')
    const lines = text.split(/\r?\n/)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      if (!line.includes('bunli')) continue

      const tokens = line.trim().split(/\s+/).filter(Boolean)
      const bunliIndex = tokens.findIndex(t => t === 'bunli')
      if (bunliIndex < 0) continue

      const cmd = tokens[bunliIndex + 1]
      if (!cmd) continue

      const spec = commands.get(cmd)
      if (!spec) continue

      const flags: string[] = []
      const stopAfterPositional = passThrough.has(cmd)

      for (let t = bunliIndex + 2; t < tokens.length; t++) {
        const tok = tokens[t]!
        if (tok === '--') break

        if (stopAfterPositional && !tok.startsWith('-')) {
          // dev passes through remaining args to the underlying CLI
          break
        }

        if (tok.startsWith('--')) {
          const raw = tok.slice(2)
          const eq = raw.indexOf('=')
          const name = (eq >= 0 ? raw.slice(0, eq) : raw).trim()
          if (name) flags.push(name)

          // Consume value token (e.g. --entry src/index.ts) when present.
          if (eq < 0 && t + 1 < tokens.length) {
            const next = tokens[t + 1]!
            if (next !== '--' && !next.startsWith('-')) t++
          }
          continue
        }
      }

      if (flags.length === 0) continue

      for (const flag of flags) {
        if (allow.has(flag)) continue
        if (!spec.flags.has(flag)) {
          unknownUses.push({
            docFile: relPath,
            line: i + 1,
            command: cmd,
            flag,
            text: line.trim(),
          })
        }
      }
    }
  }

  if (unknownUses.length > 0) {
    console.error(`[docs-cli-flags] Found unknown bunli flags (${unknownUses.length}):`)
    for (const u of unknownUses) {
      const spec = commands.get(u.command)
      const origin = spec ? ` (options from ${spec.file})` : ''
      console.error(`- ${u.docFile}:${u.line}: bunli ${u.command} --${u.flag}${origin}`)
      console.error(`  ${u.text}`)
    }
    process.exit(1)
  }

  console.log('[docs-cli-flags] OK')
}

await main()
