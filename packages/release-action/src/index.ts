import * as core from '@actions/core'
import * as github from '@actions/github'
import { ConfigLoader } from './config/loader.js'
import { Builder } from './build/builder.js'
import { ReleaseManager } from './release/manager.js'
import { ChangelogGenerator } from './release/changelog.js'
import { NPMPublisher } from './publish/npm.js'
import { HomebrewPublisher } from './publish/homebrew.js'
import type { ReleaseContext } from './types.js'

async function run(): Promise<void> {
  try {
    // Get inputs
    const configPath = core.getInput('config')
    const skipBuild = core.getBooleanInput('skip-build')
    const workingDirectory = core.getInput('working-directory')
    const githubToken = core.getInput('github-token', { required: true })
    const npmToken = core.getInput('npm-token')
    const homebrewToken = core.getInput('homebrew-token')

    // Change to working directory if specified
    if (workingDirectory && workingDirectory !== '.') {
      process.chdir(workingDirectory)
    }

    // Load configuration
    core.info(`Loading configuration from ${configPath}`)
    const configLoader = new ConfigLoader()
    const config = await configLoader.load(configPath)

    // Get version and tag information
    const context = github.context
    const tag = context.ref.replace('refs/tags/', '')
    const version = tag.replace(/^v/, '')

    // Create release context
    const releaseContext: ReleaseContext = {
      version,
      tag,
      commit: context.sha,
      date: new Date().toISOString(),
      artifacts: [],
      changelog: '',
      projectName: config.project.name,
      env: process.env as Record<string, string>
    }

    // Generate changelog
    core.startGroup('📝 Generating changelog')
    const changelogGenerator = new ChangelogGenerator(config, githubToken)
    releaseContext.changelog = await changelogGenerator.generate(tag)
    core.info('Changelog generated successfully')
    core.endGroup()

    // Build artifacts (unless skipped)
    if (!skipBuild) {
      core.startGroup('🔨 Building artifacts')
      const builder = new Builder(config)
      releaseContext.artifacts = await builder.buildAll(releaseContext)
      core.info(`Built ${releaseContext.artifacts.length} artifacts`)
      core.endGroup()

      // Generate checksums
      core.startGroup('🔐 Generating checksums')
      await builder.generateChecksums(releaseContext.artifacts)
      core.endGroup()
    } else {
      core.info('Skipping build (skip-build=true)')
      // TODO: Load artifacts from previous job
    }

    // Create GitHub release
    core.startGroup('🚀 Creating GitHub release')
    const releaseManager = new ReleaseManager(config, githubToken)
    const release = await releaseManager.createRelease(releaseContext)
    releaseContext.previousTag = release.previousTag
    core.info(`Created release: ${release.url}`)
    core.endGroup()

    // Upload artifacts
    if (releaseContext.artifacts.length > 0) {
      core.startGroup('📦 Uploading artifacts')
      await releaseManager.uploadArtifacts(release.id, releaseContext.artifacts)
      core.info(`Uploaded ${releaseContext.artifacts.length} artifacts`)
      core.endGroup()
    }

    // Publish to NPM if configured
    if (config.npm?.publish && npmToken) {
      core.startGroup('📦 Publishing to NPM')
      const npmPublisher = new NPMPublisher(config, npmToken)
      await npmPublisher.publish(releaseContext)
      core.info('Published to NPM successfully')
      core.endGroup()
    }

    // Update Homebrew formula if configured
    if (config.homebrew && homebrewToken) {
      core.startGroup('🍺 Updating Homebrew formula')
      const homebrewPublisher = new HomebrewPublisher(config, homebrewToken)
      await homebrewPublisher.updateFormulas(releaseContext, release.url)
      core.info('Updated Homebrew formula successfully')
      core.endGroup()
    }

    // Set outputs
    core.setOutput('release-url', release.url)
    core.setOutput('release-id', release.id)
    core.setOutput('artifacts', JSON.stringify(releaseContext.artifacts))
    core.setOutput('changelog', releaseContext.changelog)
    core.setOutput('version', version)

    core.info('✅ Release completed successfully!')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

// Run the action
run()