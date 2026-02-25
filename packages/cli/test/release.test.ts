import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { $ } from 'bun'
import {
  bumpVersion,
  resolvePlatforms,
  resolvePlatformsStrict,
  buildPlatformPackageName,
  buildShimPlatformMap,
  formatTag,
  getNpmPublishArgs,
  determineVersion,
  updatePackageVersion,
} from '../src/commands/release.ts'
import releaseCommand from '../src/commands/release.ts'
import { testCommand, mockPromptResponses } from '@bunli/test'
import type { BunliUtils } from '@bunli/utils'

// ── Pure unit tests ──────────────────────────────────────────────────────────

describe('bumpVersion', () => {
  test('patch increments patch segment', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
    expect(bumpVersion('1.2.9', 'patch')).toBe('1.2.10')
    expect(bumpVersion('0.0.0', 'patch')).toBe('0.0.1')
  })

  test('minor increments minor segment and resets patch', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
    expect(bumpVersion('1.0.0', 'minor')).toBe('1.1.0')
    expect(bumpVersion('0.9.9', 'minor')).toBe('0.10.0')
  })

  test('major increments major segment and resets minor and patch', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
    expect(bumpVersion('0.9.9', 'major')).toBe('1.0.0')
    expect(bumpVersion('0.0.1', 'major')).toBe('1.0.0')
  })

  test('handles missing segments gracefully', () => {
    expect(bumpVersion('1.0', 'patch')).toBe('1.0.1')
    expect(bumpVersion('1', 'minor')).toBe('1.1.0')
  })
})

describe('resolvePlatforms', () => {
  const ALL = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'windows-x64']

  test('all expands to all 5 platforms', () => {
    expect(resolvePlatforms(['all'])).toEqual(ALL)
  })

  test('explicit platform list is returned as-is', () => {
    expect(resolvePlatforms(['darwin-arm64', 'linux-x64'])).toEqual(['darwin-arm64', 'linux-x64'])
    expect(resolvePlatforms(['windows-x64'])).toEqual(['windows-x64'])
  })

  test('unknown platforms are filtered out', () => {
    expect(resolvePlatforms(['darwin-arm64', 'unknown-os-arch'])).toEqual(['darwin-arm64'])
    expect(resolvePlatforms(['bogus'])).toEqual([])
  })

  test('native resolves to current platform if supported', () => {
    const result = resolvePlatforms(['native'])
    const expected = `${process.platform}-${process.arch}`
    if (ALL.includes(expected)) {
      expect(result).toEqual([expected])
    } else {
      expect(Array.isArray(result)).toBe(true)
    }
  })

  test('mixed list preserves order and deduplicates via filter', () => {
    const result = resolvePlatforms(['darwin-arm64', 'linux-x64'])
    expect(result).toEqual(['darwin-arm64', 'linux-x64'])
  })

  test('empty array returns empty array', () => {
    expect(resolvePlatforms([])).toEqual([])
  })
})

describe('resolvePlatformsStrict', () => {
  test('throws on unsupported targets', () => {
    expect(() => resolvePlatformsStrict(['linux-x64', 'bogus-target'])).toThrow('Unsupported build.targets')
  })

  test('throws when targets resolve to zero platforms', () => {
    const nativeTarget = `${process.platform}-${process.arch}`
    if (['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'windows-x64'].includes(nativeTarget)) {
      return
    }
    expect(() => resolvePlatformsStrict(['native'])).toThrow('resolved to zero')
  })

  test('returns resolved platforms for valid targets', () => {
    expect(resolvePlatformsStrict(['linux-x64'])).toEqual(['linux-x64'])
  })
})

describe('buildPlatformPackageName', () => {
  test('default {{name}}-{{platform}} format', () => {
    expect(buildPlatformPackageName('{{name}}-{{platform}}', 'my-cli', 'darwin-arm64'))
      .toBe('my-cli-darwin-arm64')
    expect(buildPlatformPackageName('{{name}}-{{platform}}', 'tool', 'windows-x64'))
      .toBe('tool-windows-x64')
  })

  test('inverted {{platform}}-{{name}} format', () => {
    expect(buildPlatformPackageName('{{platform}}-{{name}}', 'my-cli', 'linux-x64'))
      .toBe('linux-x64-my-cli')
  })

  test('scoped npm package name', () => {
    expect(buildPlatformPackageName('{{name}}-{{platform}}', '@scope/cli', 'darwin-arm64'))
      .toBe('@scope/cli-darwin-arm64')
  })

  test('custom format with prefix', () => {
    expect(buildPlatformPackageName('@my-org/{{name}}-{{platform}}', 'tool', 'linux-arm64'))
      .toBe('@my-org/tool-linux-arm64')
  })

  test('all five platforms', () => {
    const platforms = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'windows-x64']
    for (const p of platforms) {
      expect(buildPlatformPackageName('{{name}}-{{platform}}', 'cli', p)).toBe(`cli-${p}`)
    }
  })
})

describe('buildShimPlatformMap', () => {
  test('maps windows-x64 to win32-x64', () => {
    const map = buildShimPlatformMap([
      { platform: 'windows-x64', packageName: 'my-cli-windows-x64', version: '1.0.0' }
    ])
    expect(map).toEqual({ 'win32-x64': 'my-cli-windows-x64' })
    expect(map['windows-x64']).toBeUndefined()
  })

  test('maps darwin and linux platforms as-is', () => {
    const map = buildShimPlatformMap([
      { platform: 'darwin-arm64', packageName: 'my-cli-darwin-arm64', version: '1.0.0' },
      { platform: 'linux-x64', packageName: 'my-cli-linux-x64', version: '1.0.0' },
    ])
    expect(map).toEqual({
      'darwin-arm64': 'my-cli-darwin-arm64',
      'linux-x64': 'my-cli-linux-x64',
    })
  })

  test('handles all 5 platforms, remapping windows', () => {
    const published: Array<{ platform: string; packageName: string; version: string }> = []
    const platforms = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'windows-x64']
    for (const p of platforms) published.push({ platform: p, packageName: `cli-${p}`, version: '1.0.0' })

    const map = buildShimPlatformMap(published)

    expect(Object.keys(map)).toHaveLength(5)
    expect(map['darwin-arm64']).toBe('cli-darwin-arm64')
    expect(map['darwin-x64']).toBe('cli-darwin-x64')
    expect(map['linux-arm64']).toBe('cli-linux-arm64')
    expect(map['linux-x64']).toBe('cli-linux-x64')
    expect(map['win32-x64']).toBe('cli-windows-x64')
    expect(map['windows-x64']).toBeUndefined()
  })

  test('empty published map returns empty object', () => {
    expect(buildShimPlatformMap([])).toEqual({})
  })
})

describe('formatTag', () => {
  test('supports both {{version}} and ${version} placeholders', () => {
    expect(formatTag('1.2.3', 'v{{version}}')).toBe('v1.2.3')
    expect(formatTag('1.2.3', 'release-${version}')).toBe('release-1.2.3')
  })
})

describe('getNpmPublishArgs', () => {
  test('adds --dry-run when dry mode is enabled', () => {
    expect(getNpmPublishArgs(true)).toEqual(['npm', 'publish', '--access', 'public', '--dry-run'])
  })

  test('omits --dry-run for real publish mode', () => {
    expect(getNpmPublishArgs(false)).toEqual(['npm', 'publish', '--access', 'public'])
  })
})

// ── determineVersion ─────────────────────────────────────────────────────────

function makePrompt(selectValue: string, textValue = ''): BunliUtils['prompt'] {
  return Object.assign(
    (_msg: string) => Promise.resolve(textValue),
    {
      confirm: () => Promise.resolve(true),
      select: <T>(_msg: string, opts: { options: Array<{ value: T }> }) =>
        Promise.resolve(opts.options.find(o => String(o.value) === selectValue)?.value ?? opts.options[0].value),
      password: () => Promise.resolve(''),
      multiselect: () => Promise.resolve([]),
    }
  ) as BunliUtils['prompt']
}

describe('determineVersion', () => {
  test('uses explicit version flag string as-is', async () => {
    const result = await determineVersion('2.5.0-rc.1', '1.0.0', makePrompt('patch'))
    expect(result).toBe('2.5.0-rc.1')
  })

  test('"patch" keyword bumps patch segment', async () => {
    expect(await determineVersion('patch', '1.2.3', makePrompt('patch'))).toBe('1.2.4')
  })

  test('"minor" keyword bumps minor segment', async () => {
    expect(await determineVersion('minor', '1.2.3', makePrompt('minor'))).toBe('1.3.0')
  })

  test('"major" keyword bumps major segment', async () => {
    expect(await determineVersion('major', '1.2.3', makePrompt('major'))).toBe('2.0.0')
  })

  test('prompts for selection when no flag given, picks patch', async () => {
    const result = await determineVersion(undefined, '1.2.3', makePrompt('patch'))
    expect(result).toBe('1.2.4')
  })

  test('prompts for selection and picks minor', async () => {
    const result = await determineVersion(undefined, '2.0.0', makePrompt('minor'))
    expect(result).toBe('2.1.0')
  })

  test('handles custom selection - prompts for text input', async () => {
    const result = await determineVersion(undefined, '1.0.0', makePrompt('custom', '4.0.0-beta.1'))
    expect(result).toBe('4.0.0-beta.1')
  })
})

// ── File operation tests ─────────────────────────────────────────────────────

describe('updatePackageVersion', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bunli-pkg-'))
    originalCwd = process.cwd()
    process.chdir(tmpDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test('writes bumped version to package.json', async () => {
    await Bun.write('package.json', JSON.stringify({ name: 'test-pkg', version: '1.0.0' }, null, 2) + '\n')
    await updatePackageVersion('2.0.0')
    const pkg = await Bun.file('package.json').json()
    expect(pkg.version).toBe('2.0.0')
    expect(pkg.name).toBe('test-pkg')
  })

  test('preserves all other fields', async () => {
    const original = { name: 'my-cli', version: '0.1.0', private: false, license: 'MIT', scripts: { build: 'tsc' } }
    await Bun.write('package.json', JSON.stringify(original, null, 2) + '\n')
    await updatePackageVersion('0.2.0')
    const pkg = await Bun.file('package.json').json()
    expect(pkg.version).toBe('0.2.0')
    expect(pkg.license).toBe('MIT')
    expect(pkg.scripts.build).toBe('tsc')
  })

  test('output is valid JSON ending with newline', async () => {
    await Bun.write('package.json', JSON.stringify({ name: 'x', version: '1.0.0' }, null, 2) + '\n')
    await updatePackageVersion('1.1.0')
    const raw = await Bun.file('package.json').text()
    expect(() => JSON.parse(raw)).not.toThrow()
    expect(raw.endsWith('\n')).toBe(true)
  })
})

// ── Integration tests (dry run) ───────────────────────────────────────────────
// These use a real temp git repo and testCommand with dry:true so no git/npm
// operations actually execute — we only verify the displayed steps and messages.

async function createFixture(configContent: string): Promise<{ tmpDir: string; originalCwd: string }> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'bunli-release-'))
  const originalCwd = process.cwd()

  await Bun.write(
    join(tmpDir, 'package.json'),
    JSON.stringify({
      name: 'test-cli',
      version: '1.0.0',
      scripts: {
        build: 'bun -e ""'
      }
    }, null, 2) + '\n'
  )
  await Bun.write(join(tmpDir, 'bunli.config.js'), configContent)

  await $`git init ${tmpDir}`.quiet()
  await $`git -C ${tmpDir} config user.email "test@example.com"`.quiet()
  await $`git -C ${tmpDir} config user.name "Test"`.quiet()
  await $`git -C ${tmpDir} add .`.quiet()
  await $`git -C ${tmpDir} commit -m "init"`.quiet()

  process.chdir(tmpDir)
  return { tmpDir, originalCwd }
}

function teardownFixture(tmpDir: string, originalCwd: string) {
  process.chdir(originalCwd)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── Dry run: default config ───────────────────────────────────────────────────

describe('release command - dry run, default config', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    ;({ tmpDir, originalCwd } = await createFixture(
      'export default { name: "test-cli", build: { entry: "src/cli.ts" } }'
    ))
  })

  afterEach(() => teardownFixture(tmpDir, originalCwd))

  test('--version=patch shows correct new version and all default steps', async () => {
    const result = await testCommand(releaseCommand, {
      flags: { version: 'patch', dry: true },
    })
    expect(result.stdout).toContain('1.0.1')
    expect(result.stdout).toContain('✅ Running tests')
    expect(result.stdout).toContain('✅ Updating version')
    expect(result.stdout).toContain('✅ Building project')
    expect(result.stdout).toContain('✅ Creating git tag')
    expect(result.stdout).toContain('✅ Publishing to npm')
    expect(result.exitCode).toBe(0)
  })

  test('--version=minor bumps minor correctly', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'minor', dry: true } })
    expect(result.stdout).toContain('1.1.0')
    expect(result.exitCode).toBe(0)
  })

  test('--version=major bumps major correctly', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'major', dry: true } })
    expect(result.stdout).toContain('2.0.0')
    expect(result.exitCode).toBe(0)
  })

  test('--version=1.5.0-rc.1 passes custom version through', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: '1.5.0-rc.1', dry: true, npm: false } })
    expect(result.stdout).toContain('1.5.0-rc.1')
    expect(result.exitCode).toBe(0)
  })

  test('same version as current is rejected with clear error', async () => {
    // process.exit is not mocked by testCommand, so we intercept it locally
    const originalExit = process.exit
    ;(process.exit as any) = (code: number) => { throw new Error(`EXIT:${code}`) }
    try {
      const result = await testCommand(releaseCommand, { flags: { version: '1.0.0', dry: true } })
      expect(result.stderr).toContain('Version unchanged')
      expect(result.stderr).toContain('1.0.0')
    } finally {
      process.exit = originalExit
    }
  })

  test('interactive version selection via prompt', async () => {
    const result = await testCommand(releaseCommand, {
      flags: { dry: true },
      mockPrompts: { 'Select version bump:': '2' }, // '2' → minor
    })
    expect(result.stdout).toContain('Select version bump:')
    expect(result.stdout).toContain('patch')
    expect(result.stdout).toContain('minor')
    expect(result.stdout).toContain('major')
    expect(result.stdout).toContain('1.1.0') // minor of 1.0.0
    expect(result.exitCode).toBe(0)
  })

  test('--npm=false skips npm publish step', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true, npm: false } })
    expect(result.stdout).not.toContain('Publishing to npm')
    expect(result.exitCode).toBe(0)
  })

  test('--github=true adds GitHub release step', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true, github: true } })
    expect(result.stdout).toContain('✅ Creating GitHub release')
    expect(result.exitCode).toBe(0)
  })

  test('dry run omits GitHub step by default', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true } })
    expect(result.stdout).not.toContain('Creating GitHub release')
    expect(result.exitCode).toBe(0)
  })

  test('dry run shows NPM URL in output when npm enabled', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true } })
    expect(result.stdout).toContain('npmjs.com/package/test-cli')
    expect(result.exitCode).toBe(0)
  })
})

// ── Dry run: npm:false in config ──────────────────────────────────────────────

describe('release command - config npm:false', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    ;({ tmpDir, originalCwd } = await createFixture(
      'export default { release: { npm: false, github: false } }'
    ))
  })

  afterEach(() => teardownFixture(tmpDir, originalCwd))

  test('npm publish step is skipped when config.release.npm = false', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true } })
    expect(result.stdout).not.toContain('Publishing to npm')
    expect(result.exitCode).toBe(0)
  })

  test('--npm flag overrides config.release.npm', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true, npm: true } })
    expect(result.stdout).toContain('✅ Publishing to npm')
    expect(result.exitCode).toBe(0)
  })
})

// ── Dry run: github:true in config ────────────────────────────────────────────

describe('release command - config github:true', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    ;({ tmpDir, originalCwd } = await createFixture(
      'export default { release: { github: true } }'
    ))
  })

  afterEach(() => teardownFixture(tmpDir, originalCwd))

  test('GitHub release step is shown when config.release.github = true', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true } })
    expect(result.stdout).toContain('✅ Creating GitHub release')
    expect(result.exitCode).toBe(0)
  })

  test('--github=false flag overrides config.release.github', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true, github: false } })
    expect(result.stdout).not.toContain('Creating GitHub release')
    expect(result.exitCode).toBe(0)
  })
})

// ── Dry run: custom tagFormat ─────────────────────────────────────────────────

describe('release command - custom tagFormat in config', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    ;({ tmpDir, originalCwd } = await createFixture(
      'export default { release: { tagFormat: "release-{{version}}" } }'
    ))
  })

  afterEach(() => teardownFixture(tmpDir, originalCwd))

  test('completes dry run with custom tagFormat', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'minor', dry: true } })
    expect(result.stdout).toContain('✅ Creating git tag')
    expect(result.stdout).toContain('Tag:     release-1.1.0')
    expect(result.exitCode).toBe(0)
  })

  test('--tag flag overrides config tagFormat', async () => {
    const result = await testCommand(releaseCommand, {
      flags: { version: 'patch', dry: true, tag: 'v{{version}}-custom' },
    })
    expect(result.stdout).toContain('✅ Creating git tag')
    expect(result.stdout).toContain('Tag:     v1.0.1-custom')
    expect(result.exitCode).toBe(0)
  })

  test('custom tagFormat is used for GitHub release URL', async () => {
    const result = await testCommand(releaseCommand, {
      flags: { version: 'patch', dry: true, github: true },
      mockShellCommands: {
        'git remote get-url origin': 'git@github.com:owner/repo.git',
      }
    })
    expect(result.stdout).toContain('releases/tag/release-1.0.1')
    expect(result.exitCode).toBe(0)
  })
})

// ── Dry run: binary mode ──────────────────────────────────────────────────────

describe('release command - binary mode config', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    ;({ tmpDir, originalCwd } = await createFixture(`export default {
  name: "my-tool",
  build: { entry: "src/cli.ts", targets: ["darwin-arm64", "linux-x64"] },
  release: {
    binary: {
      packageNameFormat: "{{name}}-{{platform}}",
      shimPath: "bin/run.mjs"
    }
  }
}`))
    mkdirSync(join(tmpDir, 'dist/darwin-arm64'), { recursive: true })
    mkdirSync(join(tmpDir, 'dist/linux-x64'), { recursive: true })
    await Bun.write(join(tmpDir, 'dist/darwin-arm64/cli'), 'darwin-arm64-binary')
    await Bun.write(join(tmpDir, 'dist/linux-x64/cli'), 'linux-x64-binary')
  })

  afterEach(() => teardownFixture(tmpDir, originalCwd))

  test('shows binary mode with platform count', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true } })
    expect(result.stdout).toContain('binary (2 platforms)')
    expect(result.exitCode).toBe(0)
  })

  test('includes "Publishing platform packages" step', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true } })
    expect(result.stdout).toContain('✅ Publishing platform packages')
    expect(result.exitCode).toBe(0)
  })

  test('binary platform step skipped when --npm=false', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true, npm: false } })
    expect(result.stdout).not.toContain('Publishing platform packages')
    expect(result.exitCode).toBe(0)
  })
})

// ── Dry run: all 5 platforms ──────────────────────────────────────────────────

describe('release command - binary mode with targets:all', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    ;({ tmpDir, originalCwd } = await createFixture(`export default {
  build: { entry: "src/cli.ts", targets: ["all"] },
  release: { binary: { packageNameFormat: "{{name}}-{{platform}}", shimPath: "bin/run.mjs" } }
}`))
    mkdirSync(join(tmpDir, 'dist/darwin-arm64'), { recursive: true })
    mkdirSync(join(tmpDir, 'dist/darwin-x64'), { recursive: true })
    mkdirSync(join(tmpDir, 'dist/linux-arm64'), { recursive: true })
    mkdirSync(join(tmpDir, 'dist/linux-x64'), { recursive: true })
    mkdirSync(join(tmpDir, 'dist/windows-x64'), { recursive: true })
    await Bun.write(join(tmpDir, 'dist/darwin-arm64/cli'), 'darwin-arm64-binary')
    await Bun.write(join(tmpDir, 'dist/darwin-x64/cli'), 'darwin-x64-binary')
    await Bun.write(join(tmpDir, 'dist/linux-arm64/cli'), 'linux-arm64-binary')
    await Bun.write(join(tmpDir, 'dist/linux-x64/cli'), 'linux-x64-binary')
    await Bun.write(join(tmpDir, 'dist/windows-x64/cli.exe'), 'windows-x64-binary')
  })

  afterEach(() => teardownFixture(tmpDir, originalCwd))

  test('shows 5 platforms when targets:["all"]', async () => {
    const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true } })
    expect(result.stdout).toContain('binary (5 platforms)')
    expect(result.exitCode).toBe(0)
  }, 20_000)
})

describe('release command - unsupported workflows', () => {
  let tmpDir: string
  let originalCwd: string

  beforeEach(async () => {
    ;({ tmpDir, originalCwd } = await createFixture(
      'export default { build: { entry: "src/cli.ts" }, workspace: { packages: ["packages/*"] } }'
    ))
  })

  afterEach(() => teardownFixture(tmpDir, originalCwd))

  test('--all fails with clear not-implemented error', async () => {
    const originalExit = process.exit
    ;(process.exit as any) = (code: number) => { throw new Error(`EXIT:${code}`) }
    try {
      const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true, all: true } })
      expect(result.stderr).toContain('Workspace release (--all) is not implemented yet')
    } finally {
      process.exit = originalExit
    }
  })

  test('binary release fails fast on unsupported targets', async () => {
    await Bun.write('bunli.config.js', `export default {
  build: { entry: "src/cli.ts", targets: ["darwin-arm64", "unsupported-target"] },
  release: { binary: { packageNameFormat: "{{name}}-{{platform}}", shimPath: "bin/run.mjs" } }
}`)
    const originalExit = process.exit
    ;(process.exit as any) = (code: number) => { throw new Error(`EXIT:${code}`) }
    try {
      const result = await testCommand(releaseCommand, { flags: { version: 'patch', dry: true } })
      expect(result.stderr).toContain('Unsupported build.targets for binary release')
    } finally {
      process.exit = originalExit
    }
  })
})
