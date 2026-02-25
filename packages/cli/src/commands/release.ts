import { defineCommand, option } from '@bunli/core'
import type { BunliConfig } from '@bunli/core'
import { z } from 'zod'
import { loadConfig } from '@bunli/core'
import { $ } from 'bun'
import path from 'node:path'
import type { BunliUtils } from '@bunli/utils'
import shimTemplate from './shim-template.txt' with { type: 'text' }

interface PackageJson {
  name: string
  version?: string
  private?: boolean
  license?: string
  bin?: Record<string, string>
  optionalDependencies?: Record<string, string>
  [key: string]: unknown
}

interface ReleaseFlags {
  version?: string
  tag?: string
  npm?: boolean
  github?: boolean
  dry: boolean
  all: boolean
}

interface BinaryReleaseContext {
  platforms: string[]
  outdir: string
  baseName: string
}

interface PublishedPlatformPackage {
  platform: string
  packageName: string
  version: string
}

interface ReleaseStep {
  name: string
  skip?: boolean
  runInDry?: boolean
  cmd: () => Promise<void>
}

const ALL_PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'windows-x64']

const PLATFORM_META: Record<string, { os: string; cpu: string }> = {
  'darwin-arm64': { os: 'darwin', cpu: 'arm64' },
  'darwin-x64': { os: 'darwin', cpu: 'x64' },
  'linux-arm64': { os: 'linux', cpu: 'arm64' },
  'linux-x64': { os: 'linux', cpu: 'x64' },
  'windows-x64': { os: 'win32', cpu: 'x64' },
}

export function resolvePlatforms(targets: string[]): string[] {
  if (targets.includes('all')) return ALL_PLATFORMS
  return targets
    .flatMap(t => (t === 'native' ? [`${process.platform}-${process.arch}`] : [t]))
    .filter(t => t in PLATFORM_META)
}

export function resolvePlatformsStrict(targets: string[]): string[] {
  if (!targets.length) {
    throw new Error('Binary release requires build.targets to include at least one platform')
  }

  const unsupportedTargets = targets.filter(t => t !== 'all' && t !== 'native' && !(t in PLATFORM_META))
  if (unsupportedTargets.length > 0) {
    throw new Error(`Unsupported build.targets for binary release: ${unsupportedTargets.join(', ')}`)
  }

  const resolved = Array.from(new Set(resolvePlatforms(targets)))
  if (resolved.length === 0) {
    throw new Error('Binary release resolved to zero supported platforms')
  }

  return resolved
}

export function buildPlatformPackageName(format: string, cliName: string, platform: string): string {
  return format.replace('{{name}}', cliName).replace('{{platform}}', platform)
}

export function buildShimPlatformMap(published: PublishedPlatformPackage[]): Record<string, string> {
  const platformMap: Record<string, string> = {}
  for (const item of published) {
    const key = item.platform.startsWith('windows') ? item.platform.replace('windows', 'win32') : item.platform
    platformMap[key] = item.packageName
  }
  return platformMap
}

export function formatTag(version: string, tagFormat: string): string {
  return tagFormat.replaceAll('{{version}}', version).replaceAll('${version}', version)
}

export function getNpmPublishArgs(dry: boolean): string[] {
  return ['npm', 'publish', '--access', 'public', ...(dry ? ['--dry-run'] : [])]
}

export default defineCommand({
  name: 'release',
  description: 'Create a release of your CLI',
  alias: 'r',
  options: {
    version: option(
      z.enum(['patch', 'minor', 'major']).or(z.string()).optional(),
      { short: 'v', description: 'Version to release (patch/minor/major/x.y.z)' }
    ),
    tag: option(
      z.string().optional(),
      { short: 't', description: 'Git tag format' }
    ),
    npm: option(
      z.boolean().optional(),
      { description: 'Publish to npm' }
    ),
    github: option(
      z.boolean().optional(),
      { description: 'Create GitHub release' }
    ),
    dry: option(
      z.boolean().default(false),
      { short: 'd', description: 'Dry run - show what would be done' }
    ),
    all: option(
      z.boolean().default(false),
      { description: 'Release all packages (workspace mode)' }
    )
  },
  handler: async ({ flags, prompt, spinner, colors, runtime }) => {
    const unsupportedFlags = getUnsupportedBooleanNegationFlags(runtime.args)
    if (unsupportedFlags.length > 0) {
      console.error(colors.red(`Unsupported flags: ${unsupportedFlags.join(', ')}. Use --npm=false or --github=false.`))
      process.exit(1)
    }

    const config = await loadConfig()

    if (flags.all) {
      console.error(colors.red('Workspace release (--all) is not implemented yet.'))
      process.exit(1)
    }

    try {
      const status = await $`git status --porcelain`.text()
      if (status.trim() && !flags.dry) {
        console.error(colors.red('Working directory is not clean. Please commit or stash changes first.'))
        process.exit(1)
      }
    } catch {
      console.error(colors.red('Not a git repository'))
      process.exit(1)
    }

    await releaseSingle(flags as ReleaseFlags, config, prompt, spinner, colors)
  }
})

async function releaseSingle(
  flags: ReleaseFlags,
  config: BunliConfig,
  prompt: BunliUtils['prompt'],
  spinner: BunliUtils['spinner'],
  colors: BunliUtils['colors']
) {
  const pkg = await loadPackageJson()
  const originalPackageJson = await Bun.file('package.json').text()
  const cliBinName = getCliBinName(pkg)
  const currentVersion = pkg.version ?? '0.0.0'
  const binaryConfig = config.release.binary
  const shimPath = binaryConfig?.shimPath
  const shimExisted = shimPath ? await Bun.file(shimPath).exists() : false
  const originalShimContent = shimPath && shimExisted ? await Bun.file(shimPath).text() : null

  const newVersion = await determineVersion(flags.version, currentVersion, prompt)

  if (newVersion === currentVersion) {
    console.error(colors.red(`Version unchanged: ${newVersion}. Please choose a different version.`))
    process.exit(1)
  }

  const publishNpm = flags.npm ?? config.release.npm
  const publishGitHub = flags.github ?? config.release.github

  let binaryContext: BinaryReleaseContext | null = null

  if (binaryConfig && publishNpm) {
    if (config.build.compress) {
      console.error(colors.red('Binary release is incompatible with build.compress: true - raw binaries are removed after compression.'))
      process.exit(1)
    }

    try {
      binaryContext = buildBinaryReleaseContext(config)
    } catch (error) {
      console.error(colors.red(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }
  }

  const tag = formatTag(newVersion, flags.tag ?? config.release.tagFormat)

  console.log(colors.bold(`Releasing ${pkg.name || 'CLI'}`))
  console.log(colors.dim(`  Current: ${currentVersion}`))
  console.log(colors.dim(`  New:     ${newVersion}`))
  console.log(colors.dim(`  Tag:     ${tag}`))
  if (binaryContext) {
    console.log(colors.dim(`  Mode:    binary (${binaryContext.platforms.length} platforms)`))
  }
  console.log()

  if (!flags.dry) {
    const confirmed = await prompt.confirm('Continue with release?', { default: true })
    if (!confirmed) {
      console.log(colors.yellow('Release cancelled'))
      return
    }
  }

  const steps: ReleaseStep[] = [
    {
      name: 'Running tests',
      cmd: async () => {
        const result = await $`bun test`.nothrow()
        const stderr = result.stderr.toString()
        if (result.exitCode !== 0 && !stderr.includes('No tests found')) {
          throw new Error(`Tests failed with exit code ${result.exitCode}`)
        }
      }
    },
    {
      name: 'Updating version',
      runInDry: true,
      cmd: () => updatePackageVersion(newVersion)
    },
    {
      name: 'Building project',
      cmd: () => $`bun run build`.then()
    },
    ...(binaryContext ? [{
      name: 'Publishing platform packages',
      runInDry: true,
      cmd: async () => {
        const published = await publishPlatformPackages({
          context: binaryContext!,
          pkg,
          cliBinName,
          newVersion,
          binaryConfig: binaryConfig!,
          dry: flags.dry,
          spinner,
          colors,
        })
        await updateMainPackageForBinary(published, binaryConfig!.shimPath, cliBinName)
        await generateShim(binaryConfig!.shimPath, published, cliBinName)
      }
    }] : []),
    {
      name: 'Creating git tag',
      cmd: () => createGitTag({
        tag,
        conventionalCommits: config.release.conventionalCommits,
        shimPath: binaryConfig?.shimPath
      })
    },
    {
      name: 'Publishing to npm',
      skip: !publishNpm,
      runInDry: true,
      cmd: () => publishToNpm(pkg, flags.dry)
    },
    {
      name: 'Creating GitHub release',
      skip: !publishGitHub,
      cmd: () => createGitHubRelease(tag)
    }
  ]

  try {
    for (const step of steps) {
      if (step.skip) continue

      const spin = spinner(step.name)
      spin.start()

      try {
        if (!flags.dry || step.runInDry) {
          await step.cmd()
        }
        spin.succeed(step.name)
      } catch (error) {
        spin.fail(step.name)
        console.error(colors.red(error instanceof Error ? error.message : String(error)))
        process.exit(1)
      }
    }
  } finally {
    if (binaryContext) {
      await $`rm -rf .bunli/platform-packages`.nothrow()
    }

    if (flags.dry) {
      await Bun.write('package.json', originalPackageJson)
      if (shimPath) {
        if (shimExisted && originalShimContent !== null) {
          await Bun.write(shimPath, originalShimContent)
        } else {
          await $`rm -f ${shimPath}`.nothrow()
        }
      }
    }
  }

  console.log()
  console.log(colors.green(`✨ Released ${pkg.name || 'CLI'} ${tag}!`))

  if (publishGitHub) {
    console.log(colors.dim(`GitHub: https://github.com/${await getGitHubRepo()}/releases/tag/${tag}`))
  }
  if (publishNpm) {
    console.log(colors.dim(`NPM: https://npmjs.com/package/${pkg.name}`))
  }
}

function getUnsupportedBooleanNegationFlags(args: string[]): string[] {
  return args.filter(arg => arg === '--no-npm' || arg === '--no-github')
}

function getCliBinName(pkg: PackageJson): string {
  if (pkg.bin) {
    const binNames = Object.keys(pkg.bin)
    if (binNames.length > 0 && binNames[0]) {
      return binNames[0]
    }
  }

  if (pkg.name.includes('/')) {
    const fallback = pkg.name.split('/').at(-1)
    if (fallback) return fallback
  }

  return pkg.name
}

function buildBinaryReleaseContext(config: BunliConfig): BinaryReleaseContext {
  const platforms = resolvePlatformsStrict(config.build.targets)
  const outdir = config.build.outdir ?? './dist'

  const entryRaw = config.build.entry
  if (!entryRaw) {
    throw new Error('build.entry must be set for binary release')
  }

  const entry = Array.isArray(entryRaw) ? entryRaw[0] : entryRaw
  if (!entry) {
    throw new Error('build.entry must be set for binary release')
  }

  const baseName = path.basename(entry, path.extname(entry))

  return { platforms, outdir, baseName }
}

async function loadPackageJson(): Promise<PackageJson> {
  return Bun.file('package.json').json()
}

export async function determineVersion(versionFlag: string | undefined, current: string, prompt: BunliUtils['prompt']): Promise<string> {
  if (versionFlag) {
    if (['patch', 'minor', 'major'].includes(versionFlag)) {
      return bumpVersion(current, versionFlag as 'patch' | 'minor' | 'major')
    }
    return versionFlag
  }

  const choice = await prompt.select<'patch' | 'minor' | 'major' | 'custom'>('Select version bump:', {
    options: [
      { label: `patch (${bumpVersion(current, 'patch')})`, value: 'patch' },
      { label: `minor (${bumpVersion(current, 'minor')})`, value: 'minor' },
      { label: `major (${bumpVersion(current, 'major')})`, value: 'major' },
      { label: 'custom', value: 'custom' }
    ]
  })

  if (choice === 'custom') {
    return await prompt('Enter version:')
  }

  return bumpVersion(current, choice)
}

export function bumpVersion(version: string, type: 'patch' | 'minor' | 'major'): string {
  const parts = version.split('.').map(Number)
  const [major = 0, minor = 0, patch = 0] = parts
  switch (type) {
    case 'patch': return `${major}.${minor}.${patch + 1}`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'major': return `${major + 1}.0.0`
  }
}

export async function updatePackageVersion(version: string) {
  const pkg = await loadPackageJson()
  pkg.version = version
  await Bun.write('package.json', JSON.stringify(pkg, null, 2) + '\n')
}

async function resolveArtifactPath(context: BinaryReleaseContext, platform: string): Promise<string> {
  const isWindows = platform.startsWith('windows')
  const ext = isWindows ? '.exe' : ''

  const withPlatformDir = path.join(context.outdir, platform, `${context.baseName}${ext}`)
  const rootArtifact = path.join(context.outdir, `${context.baseName}${ext}`)

  if (await Bun.file(withPlatformDir).exists()) {
    return withPlatformDir
  }

  if (context.platforms.length === 1 && await Bun.file(rootArtifact).exists()) {
    return rootArtifact
  }

  throw new Error(
    `Binary artifact not found for ${platform}. Checked: ${withPlatformDir}${context.platforms.length === 1 ? ` and ${rootArtifact}` : ''}`
  )
}

async function publishPlatformPackages(opts: {
  context: BinaryReleaseContext
  pkg: PackageJson
  cliBinName: string
  newVersion: string
  binaryConfig: NonNullable<BunliConfig['release']['binary']>
  dry: boolean
  spinner: BunliUtils['spinner']
  colors: BunliUtils['colors']
}): Promise<PublishedPlatformPackage[]> {
  const { context, pkg, cliBinName, newVersion, binaryConfig, dry, spinner, colors } = opts
  const published: PublishedPlatformPackage[] = []

  for (const platform of context.platforms) {
    const meta = PLATFORM_META[platform]
    if (!meta) {
      throw new Error(`Unsupported platform metadata: ${platform}`)
    }

    const artifactPath = await resolveArtifactPath(context, platform)

    const isWindows = platform.startsWith('windows')
    const ext = isWindows ? '.exe' : ''
    const pkgName = buildPlatformPackageName(binaryConfig.packageNameFormat, pkg.name, platform)

    const pkgDir = path.join('.bunli', 'platform-packages', platform)
    const binDir = path.join(pkgDir, 'bin')

    await $`mkdir -p ${binDir}`
    await $`cp ${artifactPath} ${path.join(binDir, `${cliBinName}${ext}`)}`

    const platformPkgJson = {
      name: pkgName,
      version: newVersion,
      description: `${platform} binary for ${pkg.name}`,
      os: [meta.os],
      cpu: [meta.cpu],
      bin: { [cliBinName]: `bin/${cliBinName}${ext}` },
      ...(pkg.license ? { license: pkg.license } : {}),
    }
    await Bun.write(path.join(pkgDir, 'package.json'), JSON.stringify(platformPkgJson, null, 2) + '\n')

    const spin = spinner(`Publishing ${pkgName}`)
    spin.stop()

    console.log(colors.dim(`\nPublishing ${pkgName}${dry ? ' (dry-run)' : ''}...`))
    const publishArgs = getNpmPublishArgs(dry)
    const proc = Bun.spawn(publishArgs, {
      cwd: path.resolve(pkgDir),
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const exitCode = await proc.exited
    if (exitCode !== 0) {
      throw new Error(`Failed to publish ${pkgName} (exit code ${exitCode})`)
    }

    spin.succeed(`Published ${pkgName}`)
    published.push({ platform, packageName: pkgName, version: newVersion })
  }

  if (published.length === 0) {
    throw new Error('Binary release did not publish any platform packages')
  }

  return published
}

async function updateMainPackageForBinary(
  published: PublishedPlatformPackage[],
  shimPath: string,
  cliBinName: string
) {
  const pkg = await loadPackageJson()
  const optionalDeps = Object.fromEntries(published.map(item => [item.packageName, item.version]))
  pkg.optionalDependencies = { ...pkg.optionalDependencies, ...optionalDeps }
  pkg.bin = { ...pkg.bin, [cliBinName]: shimPath }
  await Bun.write('package.json', JSON.stringify(pkg, null, 2) + '\n')
}

async function generateShim(
  shimPath: string,
  published: PublishedPlatformPackage[],
  cliBinName: string
) {
  const platformMap = buildShimPlatformMap(published)

  const shimContent = shimTemplate
    .replace('__PLATFORM_MAP__', JSON.stringify(platformMap, null, 2))
    .replaceAll('__CLI_BIN_NAME__', cliBinName)

  const shimDir = path.dirname(shimPath)
  await $`mkdir -p ${shimDir}`
  await Bun.write(shimPath, shimContent)
  await $`chmod +x ${shimPath}`
}

async function createGitTag(opts: { tag: string; conventionalCommits: boolean; shimPath?: string }) {
  const { tag, conventionalCommits, shimPath } = opts

  await $`git add package.json`
  if (shimPath) {
    await $`git add ${shimPath}`.nothrow()
  }

  const commitMessage = conventionalCommits
    ? `chore(release): ${tag}`
    : `chore: release ${tag}`

  await $`git commit -m ${commitMessage}`
  await $`git tag ${tag}`
  await $`git push origin main --tags`
}

async function publishToNpm(pkg: PackageJson, dry: boolean) {
  if (pkg.private) {
    throw new Error('Cannot publish private package to npm')
  }

  const publishArgs = getNpmPublishArgs(dry)
  const proc = Bun.spawn(publishArgs, {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`npm publish failed (exit code ${exitCode})`)
  }
}

async function createGitHubRelease(tag: string) {
  try {
    await $`gh --version`.quiet()
  } catch {
    console.warn('GitHub CLI not found, skipping GitHub release')
    return
  }

  await $`gh release create ${tag} --title "Release ${tag}" --generate-notes`
}

async function getGitHubRepo(): Promise<string> {
  const result = await $`git remote get-url origin`.nothrow()
  if (result.exitCode !== 0) return 'unknown/repo'
  const remote = result.stdout.toString()
  const match = remote.match(/github\.com[:/]([^\s/]+\/[^\s/]+?)(?:\.git)?(?:\s|$)/)
  return match?.[1] ?? 'unknown/repo'
}
