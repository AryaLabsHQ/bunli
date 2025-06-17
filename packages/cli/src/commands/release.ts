import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { loadConfig } from '../config.js'
import { $ } from 'bun'
import { existsSync } from 'node:fs'

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
  handler: async ({ flags, prompt, spinner, colors }) => {
    const config = await loadConfig()
    
    // Check if git repo is clean
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
    
    if (flags.all && config.workspace?.packages) {
      // Workspace mode
      await releaseWorkspace(flags, config, prompt, spinner, colors)
    } else {
      // Single package mode
      await releaseSingle(flags, config, prompt, spinner, colors)
    }
  }
})

async function releaseSingle(flags: any, config: any, prompt: any, spinner: any, colors: any) {
  const pkg = await loadPackageJson()
  const currentVersion = pkg.version || '0.0.0'
  
  // Determine new version
  const newVersion = await determineVersion(flags.version, currentVersion, prompt)
  
  console.log(colors.bold(`Releasing ${pkg.name || 'CLI'}`))
  console.log(colors.dim(`  Current: ${currentVersion}`))
  console.log(colors.dim(`  New:     ${newVersion}`))
  console.log()
  
  if (!flags.dry) {
    const confirmed = await prompt.confirm('Continue with release?', { default: true })
    if (!confirmed) {
      console.log(colors.yellow('Release cancelled'))
      return
    }
  }
  
  const steps = [
    { name: 'Running tests', cmd: () => $`bun test` },
    { name: 'Building project', cmd: () => $`bun run build` },
    { name: 'Updating version', cmd: () => updatePackageVersion(newVersion) },
    { name: 'Creating git tag', cmd: () => createGitTag(newVersion, config, flags) },
    { name: 'Publishing to npm', cmd: () => publishToNpm(flags, config) },
    { name: 'Creating GitHub release', cmd: () => createGitHubRelease(newVersion, flags, config) }
  ]
  
  for (const step of steps) {
    if (step.name.includes('npm') && !(flags.npm ?? config.release?.npm ?? true)) continue
    if (step.name.includes('GitHub') && !(flags.github ?? config.release?.github ?? true)) continue
    
    const spin = spinner(step.name)
    spin.start()
    
    try {
      if (!flags.dry) {
        await step.cmd()
      }
      spin.succeed(step.name)
    } catch (error) {
      spin.fail(step.name)
      console.error(colors.red(error instanceof Error ? error.message : String(error)))
      if (!flags.dry) process.exit(1)
    }
  }
  
  console.log()
  console.log(colors.green(`✨ Released ${pkg.name || 'CLI'} v${newVersion}!`))
  
  if (flags.github ?? config.release?.github ?? true) {
    console.log(colors.dim(`GitHub: https://github.com/${await getGitHubRepo()}/releases/tag/v${newVersion}`))
  }
  if (flags.npm ?? config.release?.npm ?? true) {
    console.log(colors.dim(`NPM: https://npmjs.com/package/${pkg.name}`))
  }
}

async function releaseWorkspace(flags: any, config: any, prompt: any, spinner: any, colors: any) {
  console.log(colors.bold('Workspace Release'))
  
  if (config.workspace?.versionStrategy === 'independent') {
    // Independent versioning - release each package separately
    console.log('Using independent versioning...')
    // Implementation would go here
  } else {
    // Fixed versioning - all packages get same version
    console.log('Using fixed versioning...')
    // Implementation would go here
  }
}

async function loadPackageJson() {
  const pkg = await Bun.file('package.json').json()
  return pkg
}

async function determineVersion(versionFlag: string | undefined, current: string, prompt: any): Promise<string> {
  if (versionFlag) {
    if (['patch', 'minor', 'major'].includes(versionFlag)) {
      return bumpVersion(current, versionFlag as 'patch' | 'minor' | 'major')
    } else {
      return versionFlag // Explicit version
    }
  }
  
  const choice = await prompt.select('Select version bump:', {
    choices: [
      { name: `patch (${bumpVersion(current, 'patch')})`, value: 'patch' },
      { name: `minor (${bumpVersion(current, 'minor')})`, value: 'minor' },
      { name: `major (${bumpVersion(current, 'major')})`, value: 'major' },
      { name: 'custom', value: 'custom' }
    ]
  })
  
  if (choice === 'custom') {
    return await prompt('Enter version:')
  }
  
  return bumpVersion(current, choice)
}

function bumpVersion(version: string, type: 'patch' | 'minor' | 'major'): string {
  const parts = version.split('.').map(Number)
  const [major = 0, minor = 0, patch = 0] = parts
  
  switch (type) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'major':
      return `${major + 1}.0.0`
  }
}

async function updatePackageVersion(version: string) {
  const pkg = await loadPackageJson()
  pkg.version = version
  await Bun.write('package.json', JSON.stringify(pkg, null, 2) + '\\n')
}

async function createGitTag(version: string, config: any, flags: any) {
  const tagFormat = flags.tag || config.release?.tagFormat || 'v${version}'
  const tag = tagFormat.replace('${version}', version)
  
  await $`git add package.json`
  await $`git commit -m "chore: release v${version}"`
  await $`git tag ${tag}`
  await $`git push origin main --tags`
}

async function publishToNpm(flags: any, config: any) {
  if (!(flags.npm ?? config.release?.npm ?? true)) return
  
  // Check if package is publishable
  const pkg = await loadPackageJson()
  if (pkg.private) {
    throw new Error('Cannot publish private package to npm')
  }
  
  await $`npm publish`
}

async function createGitHubRelease(version: string, flags: any, config: any) {
  if (!(flags.github ?? config.release?.github ?? true)) return
  
  const tag = `v${version}`
  const repo = await getGitHubRepo()
  
  // Check if gh CLI is available
  try {
    await $`gh --version`.quiet()
  } catch {
    console.warn('GitHub CLI not found, skipping GitHub release')
    return
  }
  
  await $`gh release create ${tag} --title "Release ${tag}" --generate-notes`
}

async function getGitHubRepo(): Promise<string> {
  const remote = await $`git remote get-url origin`.text()
  const match = remote.match(/github\.com[:/]([^\s/]+\/[^\s/]+?)(?:\.git)?(?:\s|$)/)
  return match?.[1] ?? 'unknown/repo'
}