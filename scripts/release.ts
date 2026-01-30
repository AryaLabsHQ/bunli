#!/usr/bin/env bun
import { $ } from 'bun'
import * as p from '@clack/prompts'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  p.cancel('Release cancelled')
  process.exit(130)
})
process.on('SIGTERM', () => {
  p.cancel('Release terminated')
  process.exit(143)
})

// ============================================================================
// Types
// ============================================================================

type VersionBump = 'major' | 'minor' | 'patch' | null

interface ConventionalCommit {
  hash: string
  type: string
  scope: string
  breaking: boolean
  message: string
}

interface PackageReleaseConfig {
  name: string
  shortName: string
  version: string
  path: string
  tagPrefix: string
  commitPaths: string[]
  publishable: boolean
}

interface ReleaseOptions {
  package?: string
  all: boolean
  dryRun: boolean
  yes: boolean
}

// ============================================================================
// Constants
// ============================================================================

const COMMIT_EMOJI: Record<string, string> = {
  feat: '✨',
  fix: '🐛',
  docs: '📝',
  style: '💄',
  refactor: '♻️',
  test: '🧪',
  chore: '🔧',
  perf: '⚡',
  ci: '👷',
  build: '📦',
  breaking: '💥',
}

const COMMIT_TYPE_REGEX = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/

// ============================================================================
// Utility Functions
// ============================================================================

function parseConventionalCommit(line: string): ConventionalCommit | null {
  // Format: "hash|type(scope): message" or "hash|type: message"
  const [hash, ...rest] = line.split('|')
  if (!hash || rest.length === 0) return null

  const commitMessage = rest.join('|')
  const match = commitMessage.match(COMMIT_TYPE_REGEX)

  if (!match) {
    // Non-conventional commit
    return {
      hash: hash.trim(),
      type: 'other',
      scope: '',
      breaking: false,
      message: commitMessage.trim(),
    }
  }

  const [, type, scope, bang, message] = match
  const hasBreakingFooter = commitMessage.includes('BREAKING CHANGE')

  return {
    hash: hash.trim(),
    type: type?.toLowerCase() || 'other',
    scope: scope || '',
    breaking: !!bang || hasBreakingFooter,
    message: message?.trim() || commitMessage.trim(),
  }
}

function determineVersionBump(commits: ConventionalCommit[]): VersionBump {
  if (commits.length === 0) return null

  // Check for breaking changes
  if (commits.some((c) => c.breaking)) {
    return 'major'
  }

  // Check for features
  if (commits.some((c) => c.type === 'feat')) {
    return 'minor'
  }

  // Any other conventional commit types
  const patchTypes = ['fix', 'refactor', 'chore', 'docs', 'test', 'perf', 'style', 'ci', 'build']
  if (commits.some((c) => patchTypes.includes(c.type))) {
    return 'patch'
  }

  // Default to patch for non-conventional commits
  return 'patch'
}

function calculateNewVersion(currentVersion: string, bump: VersionBump): string {
  if (!bump) return currentVersion

  const parts = currentVersion.split('.')
  const major = parseInt(parts[0] || '0')
  const minor = parseInt(parts[1] || '0')
  const patch = parseInt(parts[2]?.split('-')[0] || '0')

  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      return currentVersion
  }
}

function displayCommitSummary(commits: ConventionalCommit[]): void {
  if (commits.length === 0) {
    p.log.info('No commits found')
    return
  }

  const grouped = new Map<string, ConventionalCommit[]>()
  for (const commit of commits) {
    const key = commit.breaking ? 'breaking' : commit.type
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(commit)
  }

  // Display breaking changes first
  if (grouped.has('breaking')) {
    const breaking = grouped.get('breaking')!
    p.log.warn(`${COMMIT_EMOJI.breaking} Breaking Changes (${breaking.length})`)
    for (const c of breaking) {
      console.log(`    ${c.hash.slice(0, 7)} ${c.message}`)
    }
    grouped.delete('breaking')
  }

  // Display other types
  const typeOrder = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'style', 'ci', 'build', 'other']
  for (const type of typeOrder) {
    if (grouped.has(type)) {
      const commits = grouped.get(type)!
      const emoji = COMMIT_EMOJI[type] || '📌'
      p.log.info(`${emoji} ${type} (${commits.length})`)
      for (const c of commits) {
        console.log(`    ${c.hash.slice(0, 7)} ${c.message}`)
      }
    }
  }
}

// ============================================================================
// Git Functions
// ============================================================================

async function getLastTagForPackage(tagPrefix: string): Promise<string | null> {
  try {
    const { stdout } = await $`git tag -l "${tagPrefix}*" --sort=-v:refname`.quiet()
    const tags = stdout.toString().trim().split('\n').filter(Boolean)
    return tags[0] || null
  } catch {
    return null
  }
}

async function getCommitsSinceLastTag(
  lastTag: string | null,
  commitPaths: string[]
): Promise<ConventionalCommit[]> {
  try {
    const pathArgs = commitPaths.length > 0 ? ['--', ...commitPaths] : []
    const range = lastTag ? `${lastTag}..HEAD` : 'HEAD'

    const { stdout } = await $`git log ${range} --pretty=format:"%h|%s" ${pathArgs}`.quiet()
    const lines = stdout.toString().trim().split('\n').filter(Boolean)

    return lines.map(parseConventionalCommit).filter((c): c is ConventionalCommit => c !== null)
  } catch {
    return []
  }
}

async function checkAheadOfOrigin(): Promise<{ ahead: number; behind: number }> {
  try {
    // Fetch first to get latest remote state
    await $`git fetch origin --quiet`.quiet()

    const { stdout } = await $`git rev-list --left-right --count HEAD...@{upstream}`.quiet()
    const [ahead, behind] = stdout.toString().trim().split('\t').map(Number)
    return { ahead: ahead || 0, behind: behind || 0 }
  } catch {
    return { ahead: 0, behind: 0 }
  }
}

async function getCurrentBranch(): Promise<string> {
  const { stdout } = await $`git branch --show-current`.quiet()
  return stdout.toString().trim()
}

// ============================================================================
// Package Functions
// ============================================================================

async function getAllPackageConfigs(): Promise<PackageReleaseConfig[]> {
  const configs: PackageReleaseConfig[] = []
  const packagesDir = join(process.cwd(), 'packages')

  try {
    const entries = await readdir(packagesDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packagePath = join(packagesDir, entry.name)
        const packageJsonPath = join(packagePath, 'package.json')

        try {
          const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

          const isPublishable =
            !packageJson.private &&
            (packageJson.name.startsWith('@bunli/') ||
              packageJson.name === 'bunli' ||
              packageJson.name === 'create-bunli')

          if (isPublishable) {
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
          }
        } catch {
          // Skip packages without valid package.json
        }
      }
    }
  } catch (error) {
    p.log.error(`Error reading packages directory: ${error}`)
    process.exit(1)
  }

  return configs.sort((a, b) => a.name.localeCompare(b.name))
}

async function getPackageWithCommits(
  config: PackageReleaseConfig
): Promise<{ config: PackageReleaseConfig; commits: ConventionalCommit[]; lastTag: string | null }> {
  const lastTag = await getLastTagForPackage(config.tagPrefix)
  const commits = await getCommitsSinceLastTag(lastTag, config.commitPaths)

  return { config, commits, lastTag }
}

async function updatePackageVersion(packagePath: string, newVersion: string): Promise<void> {
  const packageJsonPath = join(packagePath, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

  if (packageJson.version !== newVersion) {
    packageJson.version = newVersion
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  }
}

async function getPublishedVersion(packageName: string): Promise<string | null> {
  try {
    const { stdout } = await $`npm view ${packageName} version`.quiet()
    return stdout.toString().trim() || null
  } catch {
    return null
  }
}

function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const [main] = v.split('-')
    return (main || '0.0.0').split('.').map(Number)
  }
  const [aMajor = 0, aMinor = 0, aPatch = 0] = parseVersion(a)
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parseVersion(b)

  if (aMajor !== bMajor) return aMajor - bMajor
  if (aMinor !== bMinor) return aMinor - bMinor
  return aPatch - bPatch
}

interface IncompleteRelease {
  config: PackageReleaseConfig
  localVersion: string
  publishedVersion: string | null
  needsPublish: boolean
  needsTag: boolean
}

async function checkIncompleteReleases(configs: PackageReleaseConfig[]): Promise<IncompleteRelease[]> {
  const incomplete: IncompleteRelease[] = []

  const s = p.spinner()
  s.start('Checking for incomplete releases...')

  for (const config of configs) {
    const publishedVersion = await getPublishedVersion(config.name)
    const lastTag = await getLastTagForPackage(config.tagPrefix)
    const tagVersion = lastTag?.replace(config.tagPrefix, '') || null

    const needsPublish = !publishedVersion || compareVersions(config.version, publishedVersion) > 0
    const needsTag = !tagVersion || compareVersions(config.version, tagVersion) > 0

    if (needsPublish || needsTag) {
      // Only include if local version is ahead (not just different)
      const isAhead = (!publishedVersion || compareVersions(config.version, publishedVersion) > 0) &&
                      (!tagVersion || compareVersions(config.version, tagVersion) > 0)

      if (isAhead && (needsPublish || needsTag)) {
        incomplete.push({
          config,
          localVersion: config.version,
          publishedVersion,
          needsPublish,
          needsTag,
        })
      }
    }
  }

  s.stop('Checked for incomplete releases')
  return incomplete
}

// ============================================================================
// Release Functions
// ============================================================================

async function runTests(): Promise<boolean> {
  const s = p.spinner()
  s.start('Running tests...')
  try {
    await $`bun test`.quiet()
    s.stop('All tests passed')
    return true
  } catch (error) {
    s.stop('Tests failed')
    return false
  }
}

async function buildPackages(): Promise<boolean> {
  const s = p.spinner()
  s.start('Building packages...')
  try {
    await $`bun run build`.quiet()
    s.stop('All packages built successfully')
    return true
  } catch (error) {
    s.stop('Build failed')
    return false
  }
}

async function publishPackage(config: PackageReleaseConfig, newVersion: string): Promise<boolean> {
  // Check if already published
  const publishedVersion = await getPublishedVersion(config.name)
  if (publishedVersion === newVersion) {
    p.log.info(`${config.name}@${newVersion} already published`)
    return true
  }

  p.log.step(`Publishing ${config.name}@${newVersion}...`)

  try {
    // Don't use spinner or quiet - publish may need interactive login
    await $`cd ${config.path} && bun publish --access public`
    p.log.success(`Published ${config.name}@${newVersion}`)
    return true
  } catch (error) {
    p.log.error(`Failed to publish ${config.name}`)
    return false
  }
}

async function createPackageTag(config: PackageReleaseConfig, newVersion: string): Promise<boolean> {
  const tagName = `${config.name}@${newVersion}`

  try {
    // Check if tag already exists
    const { stdout } = await $`git tag -l ${tagName}`.quiet()
    if (stdout.toString().trim()) {
      p.log.info(`Tag ${tagName} already exists`)
      return true
    }

    await $`git tag ${tagName}`
    p.log.success(`Created tag ${tagName}`)
    return true
  } catch (error) {
    p.log.error(`Failed to create tag ${tagName}`)
    return false
  }
}

async function commitVersionChanges(packages: Array<{ name: string; version: string }>): Promise<boolean> {
  try {
    const { stdout: statusOutput } = await $`git status --porcelain`.quiet()
    if (!statusOutput.toString().trim()) {
      p.log.info('No changes to commit')
      return true
    }

    await $`git add .`

    const packageList = packages.map((p) => `${p.name}@${p.version}`).join(', ')
    const message = packages.length === 1 ? `chore: release ${packageList}` : `chore: release ${packages.length} packages\n\n${packageList}`

    await $`git commit -m ${message}`
    p.log.success('Committed version changes')
    return true
  } catch (error) {
    p.log.error('Failed to commit changes')
    return false
  }
}

async function pushToRemote(): Promise<boolean> {
  const s = p.spinner()
  s.start('Pushing to remote...')

  try {
    await $`git push origin --tags`.quiet()
    await $`git push origin`.quiet()
    s.stop('Pushed to remote')
    return true
  } catch (error) {
    s.stop('Failed to push to remote')
    return false
  }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(args: string[]): ReleaseOptions {
  const options: ReleaseOptions = {
    all: false,
    dryRun: false,
    yes: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
      case '--package':
      case '-p':
        if (i + 1 < args.length) {
          options.package = args[++i]
        }
        break
      case '--all':
        options.all = true
        break
      case '--dry-run':
      case '-d':
        options.dryRun = true
        break
      case '--yes':
      case '-y':
        options.yes = true
        break
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
🚀 Bunli Release Script

Usage: bun scripts/release.ts [options]

Options:
  --package, -p <name>    Release a single package (e.g., core, @bunli/utils)
  --all                   Release all modified packages
  --dry-run, -d           Preview what would be released
  --yes, -y               Skip confirmation prompts
  --help, -h              Show this help message

Examples:
  bun scripts/release.ts                  # Interactive mode (default)
  bun scripts/release.ts -p core          # Release @bunli/core only
  bun scripts/release.ts --all            # Release all modified packages
  bun scripts/release.ts --dry-run        # Preview release
  bun scripts/release.ts --all --yes      # Release all without prompts

Features:
  • Auto-detects version bump from conventional commits
  • Per-package versioning and tags (e.g., @bunli/core@0.4.1)
  • Shows commit summary with emoji-coded types
  • Warns about unpushed commits
`)
}

// ============================================================================
// Main Release Flow
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  p.intro('🚀 Bunli Release')

  // Check git status
  const branch = await getCurrentBranch()
  const { ahead, behind } = await checkAheadOfOrigin()

  if (behind > 0) {
    p.log.warn(`You are ${behind} commit(s) behind origin/${branch}. Consider pulling first.`)
  }

  if (ahead > 0 && !options.dryRun) {
    p.log.info(`You have ${ahead} unpushed commit(s)`)
  }

  // Load all package configs
  const allConfigs = await getAllPackageConfigs()

  if (allConfigs.length === 0) {
    p.log.error('No publishable packages found')
    process.exit(1)
  }

  // Check for incomplete releases (version bumped but not published/tagged)
  const incompleteReleases = await checkIncompleteReleases(allConfigs)

  if (incompleteReleases.length > 0) {
    console.log('')
    p.log.warn('Found incomplete releases:')
    for (const inc of incompleteReleases) {
      const status: string[] = []
      if (inc.needsPublish) status.push(`npm has ${inc.publishedVersion || 'none'}`)
      if (inc.needsTag) status.push('missing tag')
      p.log.info(`  ${inc.config.name}@${inc.localVersion} (${status.join(', ')})`)
    }

    if (!options.dryRun) {
      const resume = options.yes || await p.confirm({
        message: 'Resume incomplete releases?',
      })

      if (p.isCancel(resume)) {
        p.cancel('Release cancelled')
        process.exit(0)
      }

      if (resume) {
        // Resume: publish and tag incomplete releases
        for (const inc of incompleteReleases) {
          if (inc.needsPublish) {
            await publishPackage(inc.config, inc.localVersion)
          }
          if (inc.needsTag) {
            await createPackageTag(inc.config, inc.localVersion)
          }
        }

        // Ask to push
        if (!options.yes) {
          const shouldPush = await p.confirm({
            message: 'Push tags to remote?',
          })

          if (!p.isCancel(shouldPush) && shouldPush) {
            await pushToRemote()
          } else {
            p.log.info('Run `git push origin --tags && git push` manually.')
          }
        } else {
          await pushToRemote()
        }

        p.outro('🎉 Incomplete releases finished!')
        process.exit(0)
      }
    } else {
      p.log.info('Would resume these incomplete releases')
    }
  }

  // Get commits for each package
  const packagesWithCommits = await Promise.all(allConfigs.map(getPackageWithCommits))

  // Filter to packages with changes
  const modifiedPackages = packagesWithCommits.filter((p) => p.commits.length > 0)

  // Determine which packages to release
  let packagesToRelease: typeof packagesWithCommits

  if (options.package) {
    // Single package mode
    const searchTerm = options.package.toLowerCase()
    const found = packagesWithCommits.find(
      (p) =>
        p.config.name.toLowerCase() === searchTerm ||
        p.config.shortName.toLowerCase() === searchTerm ||
        p.config.name.toLowerCase() === `@bunli/${searchTerm}`
    )

    if (!found) {
      p.log.error(`Package "${options.package}" not found`)
      p.log.info(`Available packages: ${allConfigs.map((c) => c.shortName).join(', ')}`)
      process.exit(1)
    }

    packagesToRelease = [found]
  } else if (options.all) {
    // All modified packages
    packagesToRelease = modifiedPackages
  } else {
    // Interactive mode - let user choose
    if (modifiedPackages.length === 0) {
      p.log.info('No packages have changes since their last release')
      p.outro('Nothing to release')
      process.exit(0)
    }

    if (modifiedPackages.length === 1) {
      packagesToRelease = modifiedPackages
    } else {
      const selected = await p.multiselect({
        message: 'Select packages to release',
        options: modifiedPackages.map((pkg) => ({
          value: pkg.config.name,
          label: `${pkg.config.name} (${pkg.commits.length} commits)`,
          hint: pkg.lastTag ? `last: ${pkg.lastTag}` : 'first release',
        })),
        required: true,
      })

      if (p.isCancel(selected)) {
        p.cancel('Release cancelled')
        process.exit(0)
      }

      packagesToRelease = modifiedPackages.filter((p) => (selected as string[]).includes(p.config.name))
    }
  }

  if (packagesToRelease.length === 0) {
    p.log.info('No packages selected for release')
    p.outro('Nothing to release')
    process.exit(0)
  }

  // For each package, show commits and determine version
  const releaseItems: Array<{
    config: PackageReleaseConfig
    commits: ConventionalCommit[]
    currentVersion: string
    newVersion: string
    bump: VersionBump
  }> = []

  for (const pkg of packagesToRelease) {
    console.log('')
    p.log.step(`📦 ${pkg.config.name}`)

    if (pkg.lastTag) {
      p.log.info(`Last release: ${pkg.lastTag}`)
    } else {
      p.log.info('First release for this package')
    }

    // Show commits
    displayCommitSummary(pkg.commits)

    // Determine suggested bump
    const suggestedBump = determineVersionBump(pkg.commits)
    const suggestedVersion = calculateNewVersion(pkg.config.version, suggestedBump)

    let newVersion: string
    let bump: VersionBump

    if (options.yes) {
      // Auto-accept suggested version
      newVersion = suggestedVersion
      bump = suggestedBump
      p.log.info(`Version: ${pkg.config.version} → ${newVersion} (${bump || 'no change'})`)
    } else {
      // Let user choose version
      const versionChoice = await p.select({
        message: `Version for ${pkg.config.name}`,
        options: [
          {
            value: suggestedBump || 'patch',
            label: `${suggestedVersion} (${suggestedBump || 'patch'}) (Recommended)`,
          },
          ...(suggestedBump !== 'patch'
            ? [
                {
                  value: 'patch' as const,
                  label: `${calculateNewVersion(pkg.config.version, 'patch')} (patch)`,
                },
              ]
            : []),
          ...(suggestedBump !== 'minor'
            ? [
                {
                  value: 'minor' as const,
                  label: `${calculateNewVersion(pkg.config.version, 'minor')} (minor)`,
                },
              ]
            : []),
          ...(suggestedBump !== 'major'
            ? [
                {
                  value: 'major' as const,
                  label: `${calculateNewVersion(pkg.config.version, 'major')} (major)`,
                },
              ]
            : []),
          {
            value: 'skip' as const,
            label: 'Skip this package',
          },
        ],
      })

      if (p.isCancel(versionChoice)) {
        p.cancel('Release cancelled')
        process.exit(0)
      }

      if (versionChoice === 'skip') {
        p.log.info(`Skipping ${pkg.config.name}`)
        continue
      }

      bump = versionChoice as VersionBump
      newVersion = calculateNewVersion(pkg.config.version, bump)
    }

    releaseItems.push({
      config: pkg.config,
      commits: pkg.commits,
      currentVersion: pkg.config.version,
      newVersion,
      bump,
    })
  }

  if (releaseItems.length === 0) {
    p.log.info('No packages to release')
    p.outro('Nothing to release')
    process.exit(0)
  }

  // Show release summary
  console.log('')
  p.log.step('📋 Release Summary')
  for (const item of releaseItems) {
    const bumpLabel = item.bump ? ` (${item.bump})` : ''
    p.log.info(`${item.config.name}: ${item.currentVersion} → ${item.newVersion}${bumpLabel}`)
  }

  if (options.dryRun) {
    console.log('')
    p.log.warn('DRY RUN - No changes will be made')
    p.outro('Dry run complete')
    process.exit(0)
  }

  // Confirm proceed
  if (!options.yes) {
    const proceed = await p.confirm({
      message: 'Proceed with release?',
    })

    if (p.isCancel(proceed) || !proceed) {
      p.cancel('Release cancelled')
      process.exit(0)
    }
  }

  console.log('')

  // Run tests
  if (!(await runTests())) {
    p.log.error('Release aborted due to test failures')
    process.exit(1)
  }

  // Build packages
  if (!(await buildPackages())) {
    p.log.error('Release aborted due to build failures')
    process.exit(1)
  }

  // Update versions
  for (const item of releaseItems) {
    await updatePackageVersion(item.config.path, item.newVersion)
    p.log.success(`Updated ${item.config.name} to ${item.newVersion}`)
  }

  // Commit version changes
  await commitVersionChanges(releaseItems.map((i) => ({ name: i.config.name, version: i.newVersion })))

  // Publish packages
  for (const item of releaseItems) {
    const success = await publishPackage(item.config, item.newVersion)
    if (!success) {
      p.log.error(`Failed to publish ${item.config.name}. You may need to retry.`)
    }
  }

  // Create tags
  for (const item of releaseItems) {
    await createPackageTag(item.config, item.newVersion)
  }

  // Push to remote
  if (!options.yes) {
    const shouldPush = await p.confirm({
      message: 'Push to remote?',
    })

    if (p.isCancel(shouldPush)) {
      p.log.info('Skipped pushing. Run `git push origin --tags && git push` manually.')
    } else if (shouldPush) {
      await pushToRemote()
    } else {
      p.log.info('Skipped pushing. Run `git push origin --tags && git push` manually.')
    }
  } else {
    await pushToRemote()
  }

  console.log('')
  p.outro('🎉 Release complete!')
}

main().catch((error) => {
  p.log.error(`Release failed: ${error}`)
  process.exit(1)
})
