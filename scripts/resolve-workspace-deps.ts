import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type PackageJson = {
  name?: string
  version?: string
  private?: boolean
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

type DepSection = keyof Pick<
  PackageJson,
  'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'
>

function parseArgs(argv: string[]) {
  const args = new Set(argv)
  const write = args.has('--write')
  const verbose = args.has('--verbose')

  for (const a of args) {
    if (!a.startsWith('--')) continue
    if (a === '--write' || a === '--verbose') continue
    throw new Error(`Unknown flag: ${a}`)
  }

  return { write, verbose }
}

function resolveWorkspaceRange(workspaceValue: string, resolvedVersion: string) {
  const suffix = workspaceValue.slice('workspace:'.length)
  if (suffix === '*' || suffix === '') return resolvedVersion
  if (suffix === '^') return `^${resolvedVersion}`
  if (suffix === '~') return `~${resolvedVersion}`
  // Be conservative: if someone starts using advanced workspace protocols,
  // fail fast rather than silently publishing an invalid range.
  throw new Error(`Unsupported workspace protocol: ${workspaceValue}`)
}

async function readJson(filePath: string): Promise<PackageJson> {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw) as PackageJson
}

async function main() {
  const { write, verbose } = parseArgs(process.argv.slice(2))

  const repoRoot = process.cwd()
  const packagesDir = path.join(repoRoot, 'packages')

  const entries = await readdir(packagesDir, { withFileTypes: true })
  const packageJsonPaths = entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(packagesDir, e.name, 'package.json'))

  const nameToVersion = new Map<string, string>()
  const pkgInfos: Array<{ filePath: string; json: PackageJson }> = []

  for (const filePath of packageJsonPaths) {
    const json = await readJson(filePath)
    if (!json.name || !json.version) continue
    nameToVersion.set(json.name, json.version)
    pkgInfos.push({ filePath, json })
  }

  const sections: DepSection[] = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]

  const changedFiles: string[] = []

  for (const pkg of pkgInfos) {
    if (pkg.json.private) continue

    let changed = false
    const next: PackageJson = structuredClone(pkg.json)

    for (const section of sections) {
      const deps = next[section]
      if (!deps) continue

      for (const [depName, depRange] of Object.entries(deps)) {
        if (!depRange.startsWith('workspace:')) continue

        const resolved = nameToVersion.get(depName)
        if (!resolved) {
          throw new Error(
            `Unresolved workspace dependency ${depName} in ${pkg.filePath} (${section}: ${depRange})`,
          )
        }

        deps[depName] = resolveWorkspaceRange(depRange, resolved)
        changed = true
      }
    }

    if (!changed) continue

    const raw = JSON.stringify(next, null, 2) + '\n'
    if (write) {
      await writeFile(pkg.filePath, raw, 'utf8')
    }

    changedFiles.push(pkg.filePath)
    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`rewrote workspace deps: ${path.relative(repoRoot, pkg.filePath)}`)
    }
  }

  if (changedFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.log('no workspace protocol dependencies found in publishable packages')
    return
  }

  if (!write) {
    // eslint-disable-next-line no-console
    console.log(
      `dry run: would rewrite workspace protocol dependencies in ${changedFiles.length} package.json files. Re-run with --write.`,
    )
  } else {
    // eslint-disable-next-line no-console
    console.log(`rewrote workspace protocol dependencies in ${changedFiles.length} package.json files`)
  }
}

await main()
