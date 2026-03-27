import { defineCommand, option } from '@bunli/core'
import type { BunliConfig, PromptApi, PromptSpinnerFactory, TerminalInfo } from '@bunli/core'
import { z } from 'zod'
import { loadConfig } from '@bunli/core'
import { $ } from 'bun'
import path from 'node:path'
import type { Colors } from '@bunli/utils'
import shimTemplate from './shim-template.txt' with { type: 'text' }
import {
  RELEASE_STATE_PATH,
  type ReleaseState,
  type ReleaseStepId,
  createInitialReleaseState,
  readReleaseState,
  writeReleaseState,
  clearReleaseState,
  markStepStarted,
  markStepCompleted,
  markStepFailed,
  markPlatformPublished,
  getPublishedPlatformsFromState,
} from '../utils/release-state.js'

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
  resume: boolean
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
  id: ReleaseStepId
  name: string
  skip?: boolean
  runInDry?: boolean
  probe?: () => Promise<boolean>
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
      { short: 'V', description: 'Version to release (patch/minor/major/x.y.z)' }
    ),
    tag: option(
      z.string().optional(),
      { short: 't', description: 'Git tag format' }
    ),
    npm: option(
      z.boolean().optional(),
      { description: 'Publish to npm', argumentKind: 'flag' }
    ),
    github: option(
      z.boolean().optional(),
      { description: 'Create GitHub release', argumentKind: 'flag' }
    ),
    resume: option(
      z.boolean().default(true),
      { description: 'Resume from unfinished release state', argumentKind: 'flag' }
    ),
    dry: option(
      z.boolean().default(false),
      { short: 'd', description: 'Dry run - show what would be done', argumentKind: 'flag' }
    ),
    all: option(
      z.boolean().default(false),
      { description: 'Release all packages (workspace mode)', argumentKind: 'flag' }
    )
  },
  handler: async ({ flags, prompt, spinner, colors, runtime, terminal }) => {
    const unsupportedFlags = getUnsupportedBooleanNegationFlags(runtime.args)
    if (unsupportedFlags.length > 0) {
      console.error(colors.red(`Unsupported flags: ${unsupportedFlags.join(', ')}. Use --npm=false, --github=false, or --resume=false.`))
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

    await releaseSingle(flags as ReleaseFlags, config, prompt, spinner, colors, terminal)
  }
})

async function releaseSingle(
  flags: ReleaseFlags,
  config: BunliConfig,
  prompt: PromptApi,
  spinner: PromptSpinnerFactory,
  colors: Colors,
  terminal: TerminalInfo
) {
  const pkg = await loadPackageJson()
  const originalPackageJson = await Bun.file('package.json').text()
  const cliBinName = getCliBinName(pkg)
  const currentVersion = pkg.version ?? '0.0.0'
  const binaryConfig = config.release.binary
  const shimPath = binaryConfig?.shimPath
  const shimExisted = shimPath ? await Bun.file(shimPath).exists() : false
  const originalShimContent = shimPath && shimExisted ? await Bun.file(shimPath).text() : null

  let resumeState: ReleaseState | null = null

  if (flags.resume && !flags.dry) {
    try {
      const existing = await readReleaseState()
      if (existing) {
        resumeState = await maybeResume(existing, prompt, terminal, colors)
      }
    } catch (error) {
      console.error(colors.red(error instanceof Error ? error.message : String(error)))
      console.error(colors.red(`Run with --resume=false to ignore ${RELEASE_STATE_PATH}.`))
      process.exit(1)
    }
  }

  if (!flags.resume && !flags.dry) {
    await clearReleaseState()
  }

  if (flags.dry) {
    const existing = await readReleaseState().catch(() => null)
    if (existing && flags.resume) {
      console.log(colors.dim(`Dry run ignores resume state at ${RELEASE_STATE_PATH}.`))
    }
  }

  if (resumeState) {
    if (flags.version !== undefined) {
      console.error(colors.red('Cannot use --version when resuming. Use --resume=false to start a fresh release.'))
      process.exit(1)
    }
    if (flags.tag !== undefined) {
      console.error(colors.red('Cannot use --tag when resuming. Use --resume=false to start a fresh release.'))
      process.exit(1)
    }
    if (flags.npm !== undefined && flags.npm !== resumeState.options.publishNpm) {
      console.error(colors.red('Cannot change --npm while resuming. Use --resume=false to start a fresh release.'))
      process.exit(1)
    }
    if (flags.github !== undefined && flags.github !== resumeState.options.publishGitHub) {
      console.error(colors.red('Cannot change --github while resuming. Use --resume=false to start a fresh release.'))
      process.exit(1)
    }
  }

  const publishNpm = resumeState ? resumeState.options.publishNpm : (flags.npm ?? config.release.npm)
  const publishGitHub = resumeState ? resumeState.options.publishGitHub : (flags.github ?? config.release.github)

  const newVersion = resumeState
    ? resumeState.targetVersion
    : await determineVersion(flags.version, currentVersion, prompt)

  if (!resumeState && newVersion === currentVersion) {
    console.error(colors.red(`Version unchanged: ${newVersion}. Please choose a different version.`))
    process.exit(1)
  }

  const tag = resumeState
    ? resumeState.tag
    : formatTag(newVersion, flags.tag ?? config.release.tagFormat)

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

  if (resumeState) {
    validateResumeStateOrExit(resumeState, {
      pkg,
      binaryContext,
      binaryConfig,
      publishNpm,
      publishGitHub,
      colors,
    })
  }

  let publishedPlatforms: PublishedPlatformPackage[] = resumeState ? getPublishedPlatformsFromState(resumeState) : []

  console.log(colors.bold(`${resumeState ? 'Resuming release for' : 'Releasing'} ${pkg.name || 'CLI'}`))
  if (resumeState) {
    const failedAt = resumeState.lastError?.step ?? resumeState.currentStep ?? 'unknown step'
    console.log(colors.dim(`  Resume:  ${failedAt}`))
  } else {
    console.log(colors.dim(`  Current: ${currentVersion}`))
  }
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

  let releaseState: ReleaseState | null = null

  if (!flags.dry) {
    releaseState = resumeState ?? createInitialReleaseState({
      packageName: pkg.name,
      targetVersion: newVersion,
      tag,
      publishNpm,
      publishGitHub,
      binaryEnabled: Boolean(binaryContext),
      platforms: binaryContext?.platforms ?? [],
      shimPath: binaryConfig?.shimPath,
    })

    releaseState.status = 'in_progress'
    await writeReleaseState(releaseState)
  }

  const steps: ReleaseStep[] = [
    {
      id: 'run-tests',
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
      id: 'update-version',
      name: 'Updating version',
      runInDry: true,
      probe: async () => {
        const current = await loadPackageJson()
        return current.version === newVersion
      },
      cmd: () => updatePackageVersion(newVersion)
    },
    {
      id: 'build-project',
      name: 'Building project',
      cmd: () => $`bun run build`.then()
    },
    ...(binaryContext ? [
      {
        id: 'publish-platform-packages' as const,
        name: 'Publishing platform packages',
        runInDry: true,
        probe: async () => {
          const all = await getAllPublishedPlatformPackages({
            context: binaryContext!,
            pkg,
            newVersion,
            binaryConfig: binaryConfig!,
            known: publishedPlatforms,
            dry: flags.dry,
            releaseState,
          })
          if (!all) return false
          publishedPlatforms = all
          return true
        },
        cmd: async () => {
          publishedPlatforms = await publishPlatformPackages({
            context: binaryContext!,
            pkg,
            cliBinName,
            newVersion,
            binaryConfig: binaryConfig!,
            dry: flags.dry,
            spinner,
            colors,
            known: publishedPlatforms,
            onPlatformPublished: async item => {
              if (releaseState && !flags.dry) {
                markPlatformPublished(releaseState, item.platform, item.packageName, item.version)
                await writeReleaseState(releaseState)
              }
            }
          })
        }
      },
      {
        id: 'update-main-package-for-binary' as const,
        name: 'Updating main package for binary mode',
        runInDry: true,
        probe: async () => {
          if (publishedPlatforms.length === 0 && releaseState) {
            publishedPlatforms = getPublishedPlatformsFromState(releaseState)
          }
          if (publishedPlatforms.length === 0) return false
          return mainPackageBinaryStateMatches(publishedPlatforms, binaryConfig!.shimPath, cliBinName)
        },
        cmd: async () => {
          if (publishedPlatforms.length === 0 && releaseState) {
            publishedPlatforms = getPublishedPlatformsFromState(releaseState)
          }
          if (publishedPlatforms.length === 0) {
            throw new Error('No platform packages available to update main package for binary mode')
          }
          await updateMainPackageForBinary(publishedPlatforms, binaryConfig!.shimPath, cliBinName)
        }
      },
      {
        id: 'generate-shim' as const,
        name: 'Generating binary shim',
        runInDry: true,
        probe: async () => {
          if (publishedPlatforms.length === 0 && releaseState) {
            publishedPlatforms = getPublishedPlatformsFromState(releaseState)
          }
          if (publishedPlatforms.length === 0) return false
          return shimMatches(binaryConfig!.shimPath, publishedPlatforms, cliBinName)
        },
        cmd: async () => {
          if (publishedPlatforms.length === 0 && releaseState) {
            publishedPlatforms = getPublishedPlatformsFromState(releaseState)
          }
          if (publishedPlatforms.length === 0) {
            throw new Error('No platform packages available to generate shim')
          }
          await generateShim(binaryConfig!.shimPath, publishedPlatforms, cliBinName)
        }
      }
    ] : []),
    {
      id: 'create-git-tag',
      name: 'Creating git tag',
      probe: async () => hasRemoteTag(tag),
      cmd: () => createGitTag({
        tag,
        conventionalCommits: config.release.conventionalCommits,
        shimPath: binaryConfig?.shimPath
      })
    },
    {
      id: 'publish-npm',
      name: 'Publishing to npm',
      skip: !publishNpm,
      runInDry: true,
      probe: async () => isPackageVersionPublished(pkg.name, newVersion),
      cmd: () => publishToNpm(pkg, flags.dry)
    },
    {
      id: 'create-github-release',
      name: 'Creating GitHub release',
      skip: !publishGitHub,
      probe: async () => isGitHubReleasePresent(tag),
      cmd: () => createGitHubRelease(tag)
    }
  ]

  let releaseSucceeded = false

  try {
    for (const step of steps) {
      if (step.skip) continue

      const spin = spinner(step.name)
      spin.start()

      try {
        let alreadyCompleted = false

        if (!flags.dry && releaseState) {
          const inState = releaseState.completedSteps.includes(step.id)

          if (step.probe) {
            const probeDone = await step.probe()
            if (probeDone) {
              if (!inState) {
                markStepCompleted(releaseState, step.id)
                await writeReleaseState(releaseState)
              }
              alreadyCompleted = true
            }
          } else if (inState) {
            alreadyCompleted = true
          }
        }

        if (!alreadyCompleted && (!flags.dry || step.runInDry)) {
          if (!flags.dry && releaseState) {
            markStepStarted(releaseState, step.id)
            await writeReleaseState(releaseState)
          }

          await step.cmd()

          if (!flags.dry && releaseState) {
            markStepCompleted(releaseState, step.id)
            await writeReleaseState(releaseState)
          }
        }

        spin.succeed(alreadyCompleted ? `${step.name} (already completed)` : step.name)
      } catch (error) {
        spin.fail(step.name)
        const message = error instanceof Error ? error.message : String(error)

        if (!flags.dry && releaseState) {
          markStepFailed(releaseState, step.id, message)
          await writeReleaseState(releaseState)
        }

        console.error(colors.red(message))
        process.exit(1)
      }
    }

    releaseSucceeded = true
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

    if (!flags.dry && releaseSucceeded) {
      await clearReleaseState()
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
  return args.filter(arg => arg === '--no-npm' || arg === '--no-github' || arg === '--no-resume')
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

export async function determineVersion(versionFlag: string | undefined, current: string, prompt: PromptApi): Promise<string> {
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
  spinner: PromptSpinnerFactory
  colors: Colors
  known: PublishedPlatformPackage[]
  onPlatformPublished: (item: PublishedPlatformPackage) => Promise<void>
}): Promise<PublishedPlatformPackage[]> {
  const { context, pkg, cliBinName, newVersion, binaryConfig, dry, spinner, colors, known, onPlatformPublished } = opts
  const publishedMap = new Map<string, PublishedPlatformPackage>(known.map(item => [item.platform, item]))

  for (const platform of context.platforms) {
    const meta = PLATFORM_META[platform]
    if (!meta) {
      throw new Error(`Unsupported platform metadata: ${platform}`)
    }

    const pkgName = buildPlatformPackageName(binaryConfig.packageNameFormat, pkg.name, platform)
    const alreadyKnown = publishedMap.get(platform)
    if (alreadyKnown && alreadyKnown.packageName === pkgName && alreadyKnown.version === newVersion) {
      continue
    }

    if (!dry && await isPackageVersionPublished(pkgName, newVersion)) {
      const found = { platform, packageName: pkgName, version: newVersion }
      publishedMap.set(platform, found)
      await onPlatformPublished(found)
      continue
    }

    const artifactPath = await resolveArtifactPath(context, platform)

    const isWindows = platform.startsWith('windows')
    const ext = isWindows ? '.exe' : ''

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
    const published = { platform, packageName: pkgName, version: newVersion }
    publishedMap.set(platform, published)
    await onPlatformPublished(published)
  }

  const ordered = context.platforms.map(platform => publishedMap.get(platform)).filter(Boolean) as PublishedPlatformPackage[]

  if (ordered.length === 0) {
    throw new Error('Binary release did not publish any platform packages')
  }

  return ordered
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

function generateShimContent(
  published: PublishedPlatformPackage[],
  cliBinName: string
): string {
  const platformMap = buildShimPlatformMap(published)

  return shimTemplate
    .replace('__PLATFORM_MAP__', JSON.stringify(platformMap, null, 2))
    .replaceAll('__CLI_BIN_NAME__', cliBinName)
}

async function generateShim(
  shimPath: string,
  published: PublishedPlatformPackage[],
  cliBinName: string
) {
  const shimContent = generateShimContent(published, cliBinName)

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

  const staged = await $`git diff --cached --name-only`.text()
  if (staged.trim()) {
    const commitMessage = conventionalCommits
      ? `chore(release): ${tag}`
      : `chore: release ${tag}`

    await $`git commit -m ${commitMessage}`
  }

  const hasLocal = (await $`git rev-parse -q --verify refs/tags/${tag}`.nothrow()).exitCode === 0
  if (!hasLocal) {
    await $`git tag ${tag}`
  }

  const remoteHasTag = await hasRemoteTag(tag)
  if (!remoteHasTag) {
    await $`git push origin main --tags`
  }
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

async function maybeResume(
  state: ReleaseState,
  prompt: PromptApi,
  terminal: TerminalInfo,
  colors: Colors,
): Promise<ReleaseState | null> {
  if (!terminal.isInteractive || terminal.isCI) {
    return state
  }

  const failedAt = state.lastError?.step ?? state.currentStep ?? 'unknown step'
  const shouldResume = await prompt.confirm(
    `Found unfinished release for ${state.packageName}@${state.targetVersion} (last step: ${failedAt}). Resume?`,
    { default: true }
  )

  if (!shouldResume) {
    console.log(colors.dim('Starting a fresh release and clearing old resume state.'))
    await clearReleaseState()
    return null
  }

  return state
}

function validateResumeStateOrExit(
  state: ReleaseState,
  opts: {
    pkg: PackageJson
    binaryContext: BinaryReleaseContext | null
    binaryConfig: BunliConfig['release']['binary']
    publishNpm: boolean
    publishGitHub: boolean
    colors: Colors
  }
): void {
  const { pkg, binaryContext, binaryConfig, publishNpm, publishGitHub, colors } = opts

  if (state.packageName !== pkg.name) {
    console.error(colors.red(`Resume state package mismatch: expected ${state.packageName}, found ${pkg.name}`))
    process.exit(1)
  }

  if (state.options.publishNpm !== publishNpm || state.options.publishGitHub !== publishGitHub) {
    console.error(colors.red('Resume state publish options do not match current release options.'))
    process.exit(1)
  }

  const binaryEnabled = Boolean(binaryContext)
  if (state.options.binaryEnabled !== binaryEnabled) {
    console.error(colors.red('Resume state binary mode does not match current config.'))
    process.exit(1)
  }

  if (binaryContext) {
    const currentPlatforms = [...binaryContext.platforms].sort().join(',')
    const savedPlatforms = [...state.options.platforms].sort().join(',')
    if (currentPlatforms !== savedPlatforms) {
      console.error(colors.red('Resume state platforms do not match current build.targets.'))
      process.exit(1)
    }

    if ((state.options.shimPath ?? '') !== (binaryConfig?.shimPath ?? '')) {
      console.error(colors.red('Resume state shimPath does not match current release.binary.shimPath.'))
      process.exit(1)
    }
  }
}

async function hasRemoteTag(tag: string): Promise<boolean> {
  const result = await $`git ls-remote --tags origin ${tag}`.nothrow()
  if (result.exitCode !== 0) return false
  return result.stdout.toString().trim().length > 0
}

async function isPackageVersionPublished(packageName: string, version: string): Promise<boolean> {
  const spec = `${packageName}@${version}`
  const result = await $`npm view ${spec} version --json`.nothrow()
  if (result.exitCode !== 0) return false

  const output = result.stdout.toString().trim()
  if (!output) return false

  try {
    const parsed = JSON.parse(output) as string | string[]
    if (Array.isArray(parsed)) return parsed.includes(version)
    return parsed === version
  } catch {
    return output.replaceAll('"', '') === version
  }
}

async function isGitHubReleasePresent(tag: string): Promise<boolean> {
  const ghInstalled = (await $`gh --version`.quiet().nothrow()).exitCode === 0
  if (!ghInstalled) return false

  return (await $`gh release view ${tag} --json tagName`.quiet().nothrow()).exitCode === 0
}

async function getAllPublishedPlatformPackages(opts: {
  context: BinaryReleaseContext
  pkg: PackageJson
  newVersion: string
  binaryConfig: NonNullable<BunliConfig['release']['binary']>
  known: PublishedPlatformPackage[]
  dry: boolean
  releaseState: ReleaseState | null
}): Promise<PublishedPlatformPackage[] | null> {
  const { context, pkg, newVersion, binaryConfig, known, dry, releaseState } = opts
  const byPlatform = new Map<string, PublishedPlatformPackage>(known.map(item => [item.platform, item]))

  for (const platform of context.platforms) {
    const pkgName = buildPlatformPackageName(binaryConfig.packageNameFormat, pkg.name, platform)
    const saved = byPlatform.get(platform)
    if (saved && saved.packageName === pkgName && saved.version === newVersion) {
      continue
    }

    if (dry) {
      return null
    }

    const exists = await isPackageVersionPublished(pkgName, newVersion)
    if (!exists) {
      return null
    }

    const found = { platform, packageName: pkgName, version: newVersion }
    byPlatform.set(platform, found)

    if (releaseState) {
      markPlatformPublished(releaseState, platform, pkgName, newVersion)
      await writeReleaseState(releaseState)
    }
  }

  return context.platforms.map(platform => byPlatform.get(platform)).filter(Boolean) as PublishedPlatformPackage[]
}

async function mainPackageBinaryStateMatches(
  published: PublishedPlatformPackage[],
  shimPath: string,
  cliBinName: string
): Promise<boolean> {
  const current = await loadPackageJson()
  if (!current.optionalDependencies) return false
  if (!current.bin) return false

  if (current.bin[cliBinName] !== shimPath) return false

  for (const item of published) {
    if (current.optionalDependencies[item.packageName] !== item.version) {
      return false
    }
  }

  return true
}

async function shimMatches(
  shimPath: string,
  published: PublishedPlatformPackage[],
  cliBinName: string
): Promise<boolean> {
  const file = Bun.file(shimPath)
  if (!(await file.exists())) return false

  const current = await file.text()
  const expected = generateShimContent(published, cliBinName)
  return current === expected
}
