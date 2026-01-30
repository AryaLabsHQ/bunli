import { test, expect } from 'bun:test'
import { loadConfig } from '../src/config'
import { defineConfig, bunliConfigSchema } from '@bunli/core'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('defineConfig - parses config and applies defaults', () => {
  const config = {
    name: 'test-cli',
    build: {
      entry: 'src/cli.ts'
    }
  }

  const result = defineConfig(config)
  expect(result.name).toBe('test-cli')
  expect(result.build.entry).toBe('src/cli.ts')
  // Defaults should be applied
  expect(result.build.targets).toEqual(['native'])
  expect(result.build.minify).toBe(false)
  expect(result.dev.watch).toBe(true)
})

test('bunliConfigSchema - validates valid config', () => {
  const config = {
    name: 'test-cli',
    version: '1.0.0',
    build: {
      entry: 'src/cli.ts',
      outdir: './dist',
      minify: true
    },
    dev: {
      watch: true
    }
  }
  
  const result = bunliConfigSchema.parse(config)
  expect(result.name).toBe('test-cli')
  expect(result.version).toBe('1.0.0')
  expect(result.build?.entry).toBe('src/cli.ts')
  expect(result.build?.minify).toBe(true)
  expect(result.build?.outdir).toBe('./dist')
  expect(result.dev?.watch).toBe(true)
})

test('bunliConfigSchema - handles partial build config', () => {
  const config = {
    build: {
      entry: 'src/index.ts',
      minify: false
    }
  }
  
  const result = bunliConfigSchema.parse(config)
  expect(result.build?.entry).toBe('src/index.ts')
  expect(result.build?.minify).toBe(false)
  expect(result.build?.outdir).toBeUndefined()
})

test('loadConfig - returns default config when no file found', async () => {
  const config = await loadConfig('/tmp/nonexistent')
  expect(config.build).toBeDefined()
  expect(config.dev).toBeDefined()
  expect(config.test).toBeDefined()
  expect(config.workspace).toBeDefined()
  expect(config.release).toBeDefined()
  expect(config.build?.compress).toBe(false)
  expect(config.build?.minify).toBe(false)
  expect(config.build?.sourcemap).toBe(true)
  expect(config.build?.targets).toEqual(['native'])
})

test('loadConfig - loads config from file', async () => {
  const tmpDir = tmpdir()
  const configPath = join(tmpDir, 'bunli.config.js')
  const expectedConfig = {
    name: 'test-cli',
    build: { entry: 'src/cli.ts' }
  }
  
  // Write config file
  writeFileSync(configPath, `export default ${JSON.stringify(expectedConfig)}`)
  
  try {
    const config = await loadConfig(tmpDir)
    expect(config.name).toBe('test-cli')
    expect(config.build?.entry).toBe('src/cli.ts')
  } finally {
    // Cleanup
    if (existsSync(configPath)) {
      unlinkSync(configPath)
    }
  }
})