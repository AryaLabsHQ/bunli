#!/usr/bin/env bun
import { $ } from 'bun'
import * as p from '@bunli/tui/prompt'
import { readdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { generateChangesetSummary } from './ai.js'
import { Result, TaggedError } from 'better-result'

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const tryAsync = <TValue, TError>(
  fn: () => Promise<TValue>,
  mapError: (cause: unknown) => TError
) =>
  Result.tryPromise({ try: fn, catch: mapError })

const trySync = <TValue, TError>(
  fn: () => Awaited<TValue>,
  mapError: (cause: unknown) => TError
) =>
  Result.try({ try: fn, catch: mapError })

type VersionBump = 'major' | 'minor' | 'patch'

type Commit = {
  hash: string
  type: string
  breaking: boolean
  message: string
}

type PackageReleaseConfig = {
  name: string
  shortName: string
  version: string
  path: string
  tagPrefix: string
  commitPaths: string[]
  publishable: boolean
}

type Options = {
  package?: string
  all: boolean
  since?: string
  dryRun: boolean
  pr: boolean
  yes: boolean
  ai: boolean
}

class UsageError extends TaggedError('UsageError')<{
  message: string
}>() {
  constructor(message: string) {
    super({ message })
  }
}

class HelpRequested extends TaggedError('HelpRequested')<{
  message: string
}>() {
  constructor() {
    super({ message: 'Help requested' })
  }
}

class UserCancelled extends TaggedError('UserCancelled')<{
  message: string
}>() {
  constructor(message = 'Release prepare cancelled') {
    super({ message })
  }
}

class IoError extends TaggedError('IoError')<{
  message: string
  cause: unknown
}>() {
  constructor(step: string, cause: unknown) {
    super({ message: `I/O error while ${step}: ${toErrorMessage(cause)}`, cause })
  }
}

class CommandError extends TaggedError('CommandError')<{
  message: string
  command: string
  cause: unknown
}>() {
  constructor(command: string, cause: unknown) {
    super({ message: `Command failed (${command}): ${toErrorMessage(cause)}`, command, cause })
  }
}

type ReleasePrepareError = UsageError | HelpRequested | UserCancelled | IoError | CommandError

const COMMIT_TYPE_REGEX = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/
const PATCH_TYPES = ['fix', 'refactor', 'chore', 'docs', 'test', 'perf', 'style', 'ci', 'build']

function printHelp(): void {
  console.log(`\nRelease Prepare (Changesets)\n\nUsage:\n  bun scripts/release-prepare.ts [options]\n\nOptions:\n  --package, -p <name>  Prepare a changeset for one package\n  --all                 Consider all publishable packages\n  --since <tag|commit>   Override the commit range\n  --dry-run, -d          Show output without writing files\n  --pr                   Create a PR with the changeset(s)\n  --yes, -y              Skip confirmation prompts\n  --ai                   Generate summary with AI (optional)\n  --help, -h             Show help\n`)
}

function parseArgs(args: string[]): Result<Options, ReleasePrepareError> {
  const options: Options = {
    all: false,
    dryRun: false,
    pr: false,
    yes: false,
    ai: false,
  }

  const requireValue = (flag: string, next: string | undefined): Result<string, ReleasePrepareError> => {
    if (!next || next.startsWith('-')) {
      return Result.err(new UsageError(`Missing value for ${flag}`))
    }

    return Result.ok(next)
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    switch (arg) {
      case '--package':
      case '-p': {
        const valueResult = requireValue(arg, args[index + 1])
        if (Result.isError(valueResult)) return valueResult
        options.package = valueResult.value
        index += 1
        break
      }
      case '--all':
        options.all = true
        break
      case '--since': {
        const valueResult = requireValue(arg, args[index + 1])
        if (Result.isError(valueResult)) return valueResult
        options.since = valueResult.value
        index += 1
        break
      }
      case '--dry-run':
      case '-d':
        options.dryRun = true
        break
      case '--pr':
        options.pr = true
        break
      case '--yes':
      case '-y':
        options.yes = true
        break
      case '--ai':
        options.ai = true
        break
      case '--help':
      case '-h':
        return Result.err(new HelpRequested())
      default:
        if (arg?.startsWith('-')) {
          return Result.err(new UsageError(`Unknown option: ${arg}`))
        }
    }
  }

  return Result.ok(options)
}

function parseConventionalCommit(line: string): Commit | null {
  const [hash, ...rest] = line.split('|')
  if (!hash || rest.length === 0) return null

  const message = rest.join('|').trim()
  const match = message.match(COMMIT_TYPE_REGEX)

  if (!match) {
    return {
      hash: hash.trim(),
      type: 'other',
      breaking: false,
      message,
    }
  }

  const [, type, , bang, subject] = match
  const hasBreakingFooter = message.includes('BREAKING CHANGE')

  return {
    hash: hash.trim(),
    type: type?.toLowerCase() || 'other',
    breaking: !!bang || hasBreakingFooter,
    message: subject?.trim() || message,
  }
}

function determineVersionBump(commits: Commit[]): VersionBump | null {
  if (commits.length === 0) return null

  if (commits.some((commit) => commit.breaking)) return 'major'
  if (commits.some((commit) => commit.type === 'feat')) return 'minor'
  if (commits.some((commit) => PATCH_TYPES.includes(commit.type))) return 'patch'

  return 'patch'
}

async function getAllPackageConfigs(): Promise<Result<PackageReleaseConfig[], ReleasePrepareError>> {
  const packagesDir = join(process.cwd(), 'packages')
  const entriesResult = await tryAsync(
    () => readdir(packagesDir, { withFileTypes: true }),
    (cause) => new IoError(`reading ${packagesDir}`, cause)
  )

  if (Result.isError(entriesResult)) {
    return entriesResult
  }

  const configs: PackageReleaseConfig[] = []

  for (const entry of entriesResult.value) {
    if (!entry.isDirectory()) continue

    const packagePath = join(packagesDir, entry.name)
    const packageJsonPath = join(packagePath, 'package.json')
    if (!existsSync(packageJsonPath)) continue

    const packageJsonTextResult = await tryAsync(
      () => readFile(packageJsonPath, 'utf-8'),
      (cause) => new IoError(`reading ${packageJsonPath}`, cause)
    )

    if (Result.isError(packageJsonTextResult)) {
      p.log.warn(`Skipping ${entry.name}: ${packageJsonTextResult.error.message}`)
      continue
    }

    const packageJsonResult = trySync(
      () => JSON.parse(packageJsonTextResult.value) as {
        private?: boolean
        name?: string
        version?: string
      },
      (cause) => new IoError(`parsing ${packageJsonPath}`, cause)
    )

    if (Result.isError(packageJsonResult)) {
      p.log.warn(`Skipping ${entry.name}: ${packageJsonResult.error.message}`)
      continue
    }

    const packageJson = packageJsonResult.value
    const packageName = packageJson.name
    if (!packageName) {
      p.log.warn(`Skipping ${entry.name}: missing package name`)
      continue
    }

    const isPublishable =
      !packageJson.private &&
      (packageName.startsWith('@bunli/') ||
        packageName === 'bunli' ||
        packageName === 'create-bunli')

    if (!isPublishable) continue

    const shortName = packageName.startsWith('@bunli/')
      ? packageName.replace('@bunli/', '')
      : packageName

    configs.push({
      name: packageName,
      shortName,
      version: packageJson.version || '0.0.0',
      path: packagePath,
      tagPrefix: `${packageName}@`,
      commitPaths: [`packages/${entry.name}/`],
      publishable: true,
    })
  }

  return Result.ok(configs.sort((a, b) => a.name.localeCompare(b.name)))
}

async function getLastTagForPackage(tagPrefix: string): Promise<string | null> {
  const result = await $`git tag -l ${`${tagPrefix}*`} --sort=-v:refname`.nothrow()
  if (result.exitCode !== 0) {
    p.log.warn(`Could not read tags for ${tagPrefix}: ${result.stderr.toString().trim()}`)
    return null
  }

  const tags = result.stdout.toString().trim().split('\n').filter(Boolean)
  return tags[0] || null
}

async function getCommitsSince(
  since: string | null,
  commitPaths: string[]
): Promise<Commit[]> {
  const pathArgs = commitPaths.length > 0 ? ['--', ...commitPaths] : []
  const range = since ? `${since}..HEAD` : 'HEAD'

  const result = await $`git log ${range} --pretty=format:"%h|%s" ${pathArgs}`.nothrow()
  if (result.exitCode !== 0) {
    p.log.warn(`Could not collect commits for range ${range}: ${result.stderr.toString().trim()}`)
    return []
  }

  const lines = result.stdout.toString().trim().split('\n').filter(Boolean)
  return lines.map(parseConventionalCommit).filter((commit): commit is Commit => commit !== null)
}

async function getFilesChangedSince(
  since: string | null,
  commitPaths: string[]
): Promise<string[]> {
  if (!since) return []

  const pathArgs = commitPaths.length > 0 ? ['--', ...commitPaths] : []
  const range = `${since}..HEAD`
  const result = await $`git diff --name-only ${range} ${pathArgs}`.nothrow()

  if (result.exitCode !== 0) {
    p.log.warn(`Could not collect changed files for range ${range}: ${result.stderr.toString().trim()}`)
    return []
  }

  return result.stdout.toString().trim().split('\n').filter(Boolean)
}

async function ensureCleanWorkingTree(options: Options): Promise<Result<void, ReleasePrepareError>> {
  if (options.dryRun) return Result.ok(undefined)

  const statusResult = await tryAsync(
    () => $`git status --porcelain`.text(),
    (cause) => new CommandError('git status --porcelain', cause)
  )

  if (Result.isError(statusResult)) {
    return statusResult
  }

  if (!statusResult.value.trim()) {
    return Result.ok(undefined)
  }

  if (options.yes) {
    p.log.warn('Working tree is not clean; proceeding because --yes was provided.')
    return Result.ok(undefined)
  }

  const confirmed = await p.confirm('Working tree is not clean. Continue anyway?', {
    default: false,
  })

  if (!confirmed) {
    return Result.err(new UserCancelled())
  }

  return Result.ok(undefined)
}

async function main(): Promise<Result<void, ReleasePrepareError>> {
  const parseResult = parseArgs(process.argv.slice(2))
  if (Result.isError(parseResult)) {
    return parseResult
  }

  const options = parseResult.value
  p.intro('Release Prepare')

  const cleanWorkingTreeResult = await ensureCleanWorkingTree(options)
  if (Result.isError(cleanWorkingTreeResult)) {
    return cleanWorkingTreeResult
  }

  const configResult = await getAllPackageConfigs()
  if (Result.isError(configResult)) {
    return configResult
  }

  const allConfigs = configResult.value
  if (allConfigs.length === 0) {
    return Result.err(new UsageError('No publishable packages found'))
  }

  let configsToConsider = allConfigs

  if (options.package) {
    const searchTerm = options.package.toLowerCase()
    const found = allConfigs.find(
      (pkg) =>
        pkg.name.toLowerCase() === searchTerm ||
        pkg.shortName.toLowerCase() === searchTerm ||
        pkg.name.toLowerCase() === `@bunli/${searchTerm}`
    )

    if (!found) {
      return Result.err(
        new UsageError(
          `Package "${options.package}" not found. Available packages: ${allConfigs
            .map((config) => config.shortName)
            .join(', ')}`
        )
      )
    }

    configsToConsider = [found]
  }

  const packagesWithCommits = await Promise.all(
    configsToConsider.map(async (config) => {
      const lastTag = await getLastTagForPackage(config.tagPrefix)
      const since = options.since ?? lastTag
      const commits = await getCommitsSince(since, config.commitPaths)
      const filesChanged = await getFilesChangedSince(since, config.commitPaths)
      return { config, commits, filesChanged, lastTag }
    })
  )

  const modifiedPackages = packagesWithCommits.filter((pkg) => pkg.commits.length > 0)
  let selectedPackages = packagesWithCommits

  if (!options.package && !options.all) {
    if (modifiedPackages.length === 0) {
      p.log.info('No packages have commits since their last tag')
      p.outro('Nothing to prepare')
      return Result.ok(undefined)
    }

    if (options.yes || modifiedPackages.length === 1) {
      selectedPackages = modifiedPackages
    } else {
      const selected = await p.multiselect('Select packages to include in the changeset', {
        options: modifiedPackages.map((pkg) => ({
          value: pkg.config.name,
          label: `${pkg.config.name} (${pkg.commits.length} commits)`,
          hint: pkg.lastTag ? `last: ${pkg.lastTag}` : 'first release',
        })),
        min: 1,
      })

      selectedPackages = modifiedPackages.filter((pkg) => selected.includes(pkg.config.name))
    }
  }

  if (selectedPackages.length === 0) {
    p.log.info('No packages selected')
    p.outro('Nothing to prepare')
    return Result.ok(undefined)
  }

  const entries: Array<{ name: string; bump: VersionBump; commits: Commit[]; filesChanged: string[] }> = []

  for (const pkg of selectedPackages) {
    if (pkg.commits.length === 0) continue

    const bump = determineVersionBump(pkg.commits)
    if (!bump) continue

    entries.push({
      name: pkg.config.name,
      bump,
      commits: pkg.commits,
      filesChanged: pkg.filesChanged,
    })
  }

  if (entries.length === 0) {
    p.log.info('No changesets needed based on commits')
    p.outro('Nothing to prepare')
    return Result.ok(undefined)
  }

  const packageNames = entries.map((entry) => entry.name)
  const allCommits = entries.flatMap((entry) => entry.commits.map((commit) => commit.message))
  const uniqueCommits = Array.from(new Set(allCommits))
  const allFiles = entries.flatMap((entry) => entry.filesChanged)
  const uniqueFiles = Array.from(new Set(allFiles))

  const bumpTypes = entries.reduce<Record<string, VersionBump>>((acc, entry) => {
    acc[entry.name] = entry.bump
    return acc
  }, {})

  let summary = `Release updates for ${packageNames.join(', ')}.`

  if (uniqueCommits.length > 0) {
    summary += ` Changes: ${uniqueCommits.slice(0, 3).join('; ')}.`
  }

  if (options.ai) {
    if (!process.env.AI_GATEWAY_API_KEY) {
      p.log.warn('AI_GATEWAY_API_KEY not set; using deterministic summary.')
    } else {
      const summaryResult = await tryAsync(
        () =>
          generateChangesetSummary({
            packageNames,
            bumpTypes,
            commits: uniqueCommits,
            filesChanged: uniqueFiles,
          }),
        (cause) => new CommandError('generateChangesetSummary', cause)
      )

      if (Result.isOk(summaryResult)) {
        summary = summaryResult.value
      } else {
        p.log.warn(`AI summary failed: ${summaryResult.error.message}`)
        p.log.info('Falling back to deterministic summary')
      }
    }
  }

  const changesetId = `release-${randomBytes(4).toString('hex')}`
  const changesetPath = join(process.cwd(), '.changeset', `${changesetId}.md`)
  const frontmatter = entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => `"${entry.name}": ${entry.bump}`)
    .join('\n')

  const content = `---\n${frontmatter}\n---\n\n${summary}\n`

  p.log.info(`Changeset: .changeset/${changesetId}.md`)

  if (options.dryRun) {
    p.log.info('Dry run enabled; no files will be written.')
    console.log('\n' + content)
    p.outro('Dry run complete')
    return Result.ok(undefined)
  }

  if (!existsSync(join(process.cwd(), '.changeset'))) {
    return Result.err(new UsageError('Missing .changeset directory. Run changeset init first.'))
  }

  const writeResult = await tryAsync(
    () => writeFile(changesetPath, content),
    (cause) => new IoError(`writing ${changesetPath}`, cause)
  )

  if (Result.isError(writeResult)) {
    return writeResult
  }

  p.log.success('Changeset written')

  if (options.pr) {
    if (!options.yes) {
      const confirmPr = await p.confirm('Create a PR with this changeset?', {
        default: true,
      })

      if (!confirmPr) {
        p.outro('Changeset prepared without PR')
        return Result.ok(undefined)
      }
    }

    const ghCheck = await $`gh --version`.nothrow()
    if (ghCheck.exitCode !== 0) {
      return Result.err(new UsageError('GitHub CLI (gh) not found. Install it to use --pr.'))
    }

    const beforeBranchResult = await $`git branch --show-current`.nothrow()
    if (beforeBranchResult.exitCode !== 0) {
      return Result.err(new CommandError('git branch --show-current', beforeBranchResult.stderr.toString()))
    }

    const beforeBranch = beforeBranchResult.stdout.toString().trim() || null
    const branchName = `release/${Date.now()}`
    const title = 'chore: release prep'
    const body = `## Release changeset\n\nPackages:\n${packageNames
      .map((name) => `- ${name}`)
      .join('\n')}\n\nSummary:\n${summary}`

    const createPrResult = await tryAsync(
      async () => {
        await $`git checkout -b ${branchName}`
        await $`git add .changeset/${changesetId}.md`
        await $`git commit -m ${`chore: add changeset for ${packageNames.join(', ')}`}`
        await $`git push -u origin ${branchName}`
        await $`gh pr create --title ${title} --body ${body}`
      },
      (cause) => new CommandError('creating PR branch and GitHub PR', cause)
    )

    if (beforeBranch) {
      const checkoutBackResult = await $`git checkout ${beforeBranch}`.nothrow()
      if (checkoutBackResult.exitCode !== 0) {
        p.log.warn(`Failed to checkout ${beforeBranch}: ${checkoutBackResult.stderr.toString().trim()}`)
      }
    }

    if (Result.isError(createPrResult)) {
      return createPrResult
    }

    p.outro('PR created')
    return Result.ok(undefined)
  }

  p.outro('Changeset prepared')
  return Result.ok(undefined)
}

try {
  const result = await main()
  if (Result.isError(result)) {
    if (result.error instanceof HelpRequested) {
      printHelp()
      process.exit(0)
    }

    if (result.error instanceof UserCancelled) {
      p.cancel(result.error.message)
      process.exit(0)
    }

    if (result.error instanceof UsageError) {
      p.log.error(result.error.message)
      printHelp()
      process.exit(1)
    }

    p.log.error(`Release prepare failed: ${result.error.message}`)
    process.exit(1)
  }
} catch (error) {
  if (error instanceof p.PromptCancelledError) {
    process.exit(0)
  }

  p.log.error(`Release prepare failed: ${toErrorMessage(error)}`)
  process.exit(1)
}
