#!/usr/bin/env bun
import { $ } from 'bun'
import * as p from '@clack/prompts'
import { readdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { generateChangesetSummary } from './ai.js'

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

const COMMIT_TYPE_REGEX = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/

const PATCH_TYPES = ['fix', 'refactor', 'chore', 'docs', 'test', 'perf', 'style', 'ci', 'build']

function parseArgs(args: string[]): Options {
  const options: Options = {
    all: false,
    dryRun: false,
    pr: false,
    yes: false,
    ai: false,
  }

  const requireValue = (flag: string, next: string | undefined): string => {
    if (!next || next.startsWith('-')) {
      p.log.error(`Missing value for ${flag}`)
      printHelp()
      process.exit(1)
    }
    return next
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--package':
      case '-p':
        options.package = requireValue(arg, args[i + 1])
        i++
        break
      case '--all':
        options.all = true
        break
      case '--since':
        options.since = requireValue(arg, args[i + 1])
        i++
        break
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
        printHelp()
        process.exit(0)
      default:
        if (arg.startsWith('-')) {
          p.log.error(`Unknown option: ${arg}`)
          printHelp()
          process.exit(1)
        }
    }
  }

  return options
}

function printHelp(): void {
  console.log(`\nRelease Prepare (Changesets)\n\nUsage:\n  bun scripts/release-prepare.ts [options]\n\nOptions:\n  --package, -p <name>  Prepare a changeset for one package\n  --all                 Consider all publishable packages\n  --since <tag|commit>   Override the commit range\n  --dry-run, -d          Show output without writing files\n  --pr                   Create a PR with the changeset(s)\n  --yes, -y              Skip confirmation prompts\n  --ai                   Generate summary with AI (optional)\n  --help, -h             Show help\n`)
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

  if (commits.some((c) => c.breaking)) return 'major'
  if (commits.some((c) => c.type === 'feat')) return 'minor'
  if (commits.some((c) => PATCH_TYPES.includes(c.type))) return 'patch'

  return 'patch'
}

async function getAllPackageConfigs(): Promise<PackageReleaseConfig[]> {
  const configs: PackageReleaseConfig[] = []
  const packagesDir = join(process.cwd(), 'packages')

  const entries = await readdir(packagesDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const packagePath = join(packagesDir, entry.name)
    const packageJsonPath = join(packagePath, 'package.json')

    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
      const isPublishable =
        !packageJson.private &&
        (packageJson.name.startsWith('@bunli/') ||
          packageJson.name === 'bunli' ||
          packageJson.name === 'create-bunli')

      if (!isPublishable) continue

      const shortName = packageJson.name.startsWith('@bunli/')
        ? packageJson.name.replace('@bunli/', '')
        : packageJson.name

      configs.push({
        name: packageJson.name,
        shortName,
        version: packageJson.version,
        path: packagePath,
        tagPrefix: `${packageJson.name}@`,
        commitPaths: [`packages/${entry.name}/`],
        publishable: true,
      })
    } catch {
      // Ignore packages without valid package.json
    }
  }

  return configs.sort((a, b) => a.name.localeCompare(b.name))
}

async function getLastTagForPackage(tagPrefix: string): Promise<string | null> {
  try {
    const { stdout } = await $`git tag -l ${`${tagPrefix}*`} --sort=-v:refname`.quiet()
    const tags = stdout.toString().trim().split('\n').filter(Boolean)
    return tags[0] || null
  } catch {
    return null
  }
}

async function getCommitsSince(
  since: string | null,
  commitPaths: string[]
): Promise<Commit[]> {
  try {
    const pathArgs = commitPaths.length > 0 ? ['--', ...commitPaths] : []
    const range = since ? `${since}..HEAD` : 'HEAD'
    const { stdout } = await $`git log ${range} --pretty=format:"%h|%s" ${pathArgs}`.quiet()
    const lines = stdout.toString().trim().split('\n').filter(Boolean)
    return lines.map(parseConventionalCommit).filter((c): c is Commit => c !== null)
  } catch {
    return []
  }
}

async function getFilesChangedSince(
  since: string | null,
  commitPaths: string[]
): Promise<string[]> {
  try {
    if (!since) return []
    const pathArgs = commitPaths.length > 0 ? ['--', ...commitPaths] : []
    const range = since ? `${since}..HEAD` : 'HEAD'
    const { stdout } = await $`git diff --name-only ${range} ${pathArgs}`.quiet()
    return stdout.toString().trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

async function ensureCleanWorkingTree(options: Options): Promise<void> {
  if (options.dryRun) return

  const status = await $`git status --porcelain`.text()
  if (!status.trim()) return

  if (options.yes) {
    p.log.warn('Working tree is not clean; proceeding because --yes was provided.')
    return
  }

  const confirmed = await p.confirm({
    message: 'Working tree is not clean. Continue anyway?',
    initialValue: false,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Release prepare cancelled')
    process.exit(0)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  p.intro('Release Prepare')

  await ensureCleanWorkingTree(options)

  const allConfigs = await getAllPackageConfigs()
  if (allConfigs.length === 0) {
    p.log.error('No publishable packages found')
    process.exit(1)
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
      p.log.error(`Package "${options.package}" not found`)
      p.log.info(`Available packages: ${allConfigs.map((c) => c.shortName).join(', ')}`)
      process.exit(1)
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
      return
    }

    if (options.yes) {
      selectedPackages = modifiedPackages
    } else if (modifiedPackages.length === 1) {
      selectedPackages = modifiedPackages
    } else {
      const selected = await p.multiselect({
        message: 'Select packages to include in the changeset',
        options: modifiedPackages.map((pkg) => ({
          value: pkg.config.name,
          label: `${pkg.config.name} (${pkg.commits.length} commits)`,
          hint: pkg.lastTag ? `last: ${pkg.lastTag}` : 'first release',
        })),
        required: true,
      })

      if (p.isCancel(selected)) {
        p.cancel('Release prepare cancelled')
        process.exit(0)
      }

      selectedPackages = modifiedPackages.filter((pkg) => (selected as string[]).includes(pkg.config.name))
    }
  }

  if (selectedPackages.length === 0) {
    p.log.info('No packages selected')
    p.outro('Nothing to prepare')
    return
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
    return
  }

  const packageNames = entries.map((e) => e.name)
  const allCommits = entries.flatMap((e) => e.commits.map((c) => c.message))
  const uniqueCommits = Array.from(new Set(allCommits))
  const allFiles = entries.flatMap((e) => e.filesChanged)
  const uniqueFiles = Array.from(new Set(allFiles))

  const bumpTypes = entries.reduce<Record<string, VersionBump>>((acc, entry) => {
    acc[entry.name] = entry.bump
    return acc
  }, {})

  let summary = `Release updates for ${packageNames.join(', ')}.`

  if (uniqueCommits.length > 0) {
    const highlights = uniqueCommits.slice(0, 3).join('; ')
    summary += ` Changes: ${highlights}.`
  }

  if (options.ai) {
    const hasKey = Boolean(process.env.AI_GATEWAY_API_KEY)
    if (!hasKey) {
      p.log.warn('AI_GATEWAY_API_KEY not set; using deterministic summary.')
    } else {
      try {
        summary = await generateChangesetSummary({
          packageNames,
          bumpTypes,
          commits: uniqueCommits,
          filesChanged: uniqueFiles,
        })
      } catch (error) {
        p.log.warn(`AI summary failed: ${error instanceof Error ? error.message : String(error)}`)
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
    return
  }

  if (!existsSync(join(process.cwd(), '.changeset'))) {
    p.log.error('Missing .changeset directory. Run changeset init first.')
    process.exit(1)
  }

  await writeFile(changesetPath, content)
  p.log.success('Changeset written')

  if (options.pr) {
    if (!options.yes) {
      const confirmPr = await p.confirm({
        message: 'Create a PR with this changeset?',
        initialValue: true,
      })

      if (p.isCancel(confirmPr) || !confirmPr) {
        p.outro('Changeset prepared without PR')
        return
      }
    }

    try {
      await $`gh --version`.quiet()
    } catch {
      p.log.error('GitHub CLI (gh) not found. Install it to use --pr.')
      process.exit(1)
    }

    const { stdout: beforeBranchStdout } = await $`git branch --show-current`.quiet()
    const beforeBranch = beforeBranchStdout.toString().trim() || null

    const branchName = `release/${Date.now()}`
    const title = `chore: release prep`
    const body = `## Release changeset\n\nPackages:\n${packageNames.map((name) => `- ${name}`).join('\n')}\n\nSummary:\n${summary}`

    try {
      await $`git checkout -b ${branchName}`
      await $`git add .changeset/${changesetId}.md`
      await $`git commit -m ${`chore: add changeset for ${packageNames.join(', ')}`}`
      await $`git push -u origin ${branchName}`
      await $`gh pr create --title ${title} --body ${body}`
    } finally {
      if (beforeBranch) {
        await $`git checkout ${beforeBranch}`
      }
    }

    p.outro('PR created')
    return
  }

  p.outro('Changeset prepared')
}

main().catch((error) => {
  p.log.error(`Release prepare failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
