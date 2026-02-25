import { $ } from 'bun'
import { readdir, readFile, writeFile, mkdir, appendFile, mkdtemp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

type PublishedPackage = { name: string; version: string }

const REGISTRY = 'https://registry.npmjs.org'

async function ensureNpmAuth() {
  const token = process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN
  if (!token) {
    throw new Error('Missing NPM_TOKEN (or NODE_AUTH_TOKEN) in environment')
  }

  // Some tooling (and sometimes Bun itself) prefers NODE_AUTH_TOKEN-style env auth.
  // Setting these ensures child processes (bun publish) see them even if npmrc resolution differs.
  process.env.NODE_AUTH_TOKEN = token
  process.env.BUN_AUTH_TOKEN = token

  // Ensure there is always a userconfig file, and point tooling at it explicitly.
  // This avoids relying on Bun's npmrc discovery across `--cwd` boundaries.
  const userConfigPath = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'bunli-npmrc')
  const line = `//registry.npmjs.org/:_authToken=${token}\n`
  await writeFile(userConfigPath, line, 'utf8')
  process.env.NPM_CONFIG_USERCONFIG = userConfigPath
  process.env.npm_config_userconfig = userConfigPath

  const npmrcPath = path.join(os.homedir(), '.npmrc')

  // Avoid clobbering user configs; in CI this is typically empty anyway.
  if (existsSync(npmrcPath)) {
    const existing = await readFile(npmrcPath, 'utf8')
    if (existing.includes('_authToken=')) return
    await appendFile(npmrcPath, line)
    return
  }

  await writeFile(npmrcPath, line, 'utf8')
}

async function versionExistsOnNpm(name: string, version: string): Promise<boolean> {
  const url = `${REGISTRY}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
  const res = await fetch(url)

  if (res.status === 404) return false
  if (res.ok) return true

  const body = await res.text().catch(() => '')
  throw new Error(`Failed to query npm registry for ${name}@${version}: ${res.status} ${res.statusText}${body ? `\n${body}` : ''}`)
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function listPublishablePackages(): Promise<Array<{ dir: string; name: string; version: string }>> {
  const packagesRoot = path.join(process.cwd(), 'packages')
  const entries = await readdir(packagesRoot, { withFileTypes: true })

  const pkgs: Array<{ dir: string; name: string; version: string }> = []

  for (const ent of entries) {
    if (!ent.isDirectory()) continue

    const dir = path.join(packagesRoot, ent.name)
    const pkgPath = path.join(dir, 'package.json')
    if (!existsSync(pkgPath)) continue

    const pkg = await readJson(pkgPath)
    if (pkg.private) continue

    const name = String(pkg.name || '')
    const version = String(pkg.version || '')
    if (!name || !version) {
      throw new Error(`Invalid package.json in ${dir}: missing name or version`)
    }

    pkgs.push({ dir, name, version })
  }

  pkgs.sort((a, b) => a.name.localeCompare(b.name))
  return pkgs
}

async function publishPackage(dir: string) {
  /**
   * bun publish is currently unreliable in GitHub Actions for token-based auth in this repo.
   *
   * Instead:
   * 1) pack with Bun (so `workspace:*` deps resolve in the tarball)
   * 2) publish the tarball with npm (so auth via NPM_TOKEN works reliably)
   */
  const packDir = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'bunli-pack-'))

  // Pack without running scripts; CI already ran `bun run build`.
  await $`bun pm pack --cwd ${dir} --destination ${packDir} --ignore-scripts`

  const packed = (await readdir(packDir)).filter((f) => f.endsWith('.tgz'))
  if (packed.length !== 1) {
    throw new Error(`Expected exactly one .tgz in ${packDir}, found ${packed.length}`)
  }

  const tgzPath = path.join(packDir, packed[0]!)

  // Publish tarball using npm for robust token auth.
  await $`npm publish ${tgzPath} --access public --tag latest`
}

async function writePublishedFile(published: PublishedPackage[]) {
  const outDir = path.join(process.cwd(), '.changeset')
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, 'published-packages.json')
  await writeFile(outPath, JSON.stringify(published, null, 2) + '\n', 'utf8')
}

async function main() {
  await ensureNpmAuth()

  const pkgs = await listPublishablePackages()
  const published: PublishedPackage[] = []

  for (const pkg of pkgs) {
    const exists = await versionExistsOnNpm(pkg.name, pkg.version)
    if (exists) {
      console.log(`skip ${pkg.name}@${pkg.version} (already on npm)`)
      continue
    }

    console.log(`publish ${pkg.name}@${pkg.version}`)
    await publishPackage(pkg.dir)
    published.push({ name: pkg.name, version: pkg.version })
  }

  await writePublishedFile(published)

  if (published.length === 0) {
    console.log('No packages published.')
    return
  }

  // Create per-package tags like `pkg@x.y.z`.
  await $`bunx changeset tag`
  if (process.env.CI) {
    await $`git push origin --tags`
  } else {
    console.log('Skipping tag push because CI is not set.')
  }
}

await main()
