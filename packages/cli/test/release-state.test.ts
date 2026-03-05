import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  RELEASE_STATE_PATH,
  clearReleaseState,
  createInitialReleaseState,
  getPublishedPlatformsFromState,
  markPlatformPublished,
  markStepCompleted,
  markStepFailed,
  markStepStarted,
  readReleaseState,
  writeReleaseState,
} from '../src/utils/release-state.ts'

describe('release-state', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bunli-release-state-'))
    originalCwd = process.cwd()
    process.chdir(tmpDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('createInitialReleaseState initializes required fields', () => {
    const state = createInitialReleaseState({
      packageName: 'my-cli',
      targetVersion: '1.2.3',
      tag: 'v1.2.3',
      publishNpm: true,
      publishGitHub: false,
      binaryEnabled: true,
      platforms: ['darwin-arm64', 'linux-x64'],
      shimPath: 'bin/run.mjs',
    })

    expect(state.packageName).toBe('my-cli')
    expect(state.targetVersion).toBe('1.2.3')
    expect(state.options.binaryEnabled).toBe(true)
    expect(state.options.platforms).toEqual(['darwin-arm64', 'linux-x64'])
    expect(state.completedSteps).toEqual([])
    expect(state.binary?.publishedPlatforms).toEqual({})
  })

  test('write/read roundtrip preserves state', async () => {
    const state = createInitialReleaseState({
      packageName: 'my-cli',
      targetVersion: '1.0.1',
      tag: 'v1.0.1',
      publishNpm: true,
      publishGitHub: true,
      binaryEnabled: false,
      platforms: [],
    })

    markStepStarted(state, 'run-tests')
    markStepCompleted(state, 'run-tests')
    markStepStarted(state, 'publish-npm')
    markStepFailed(state, 'publish-npm', 'registry timeout')

    await writeReleaseState(state)
    const loaded = await readReleaseState()

    expect(loaded).not.toBeNull()
    expect(loaded?.currentStep).toBe('publish-npm')
    expect(loaded?.completedSteps).toEqual(['run-tests'])
    expect(loaded?.lastError?.message).toContain('timeout')
  })

  test('markPlatformPublished stores and rehydrates per-platform metadata', async () => {
    const state = createInitialReleaseState({
      packageName: 'my-cli',
      targetVersion: '2.0.0',
      tag: 'v2.0.0',
      publishNpm: true,
      publishGitHub: false,
      binaryEnabled: true,
      platforms: ['darwin-arm64', 'linux-x64'],
      shimPath: 'bin/run.mjs',
    })

    markPlatformPublished(state, 'darwin-arm64', 'my-cli-darwin-arm64', '2.0.0')
    markPlatformPublished(state, 'linux-x64', 'my-cli-linux-x64', '2.0.0')
    await writeReleaseState(state)

    const loaded = await readReleaseState()
    expect(loaded).not.toBeNull()
    expect(getPublishedPlatformsFromState(loaded!)).toEqual([
      { platform: 'darwin-arm64', packageName: 'my-cli-darwin-arm64', version: '2.0.0' },
      { platform: 'linux-x64', packageName: 'my-cli-linux-x64', version: '2.0.0' },
    ])
  })

  test('clearReleaseState removes persisted file', async () => {
    const state = createInitialReleaseState({
      packageName: 'my-cli',
      targetVersion: '1.0.0',
      tag: 'v1.0.0',
      publishNpm: true,
      publishGitHub: false,
      binaryEnabled: false,
      platforms: [],
    })

    await writeReleaseState(state)
    expect(await Bun.file(RELEASE_STATE_PATH).exists()).toBe(true)

    await clearReleaseState()
    expect(await Bun.file(RELEASE_STATE_PATH).exists()).toBe(false)
    expect(await readReleaseState()).toBeNull()
  })
})
