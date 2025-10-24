import { test, expect } from 'bun:test'
import { loadConfig } from '../src/config'
import { defineConfig, bunliConfigSchema } from '@bunli/core'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('defineConfig - returns config as-is', () => {
  const config = {
    name: 'test-cli',
    build: {
      entry: 'src/cli.ts'
    }
  }
  
  const result = defineConfig(config)
  expect(result).toEqual(config)
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
  expect(result).toEqual(config)
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
  expect(config).toEqual({
    build: {},
    dev: {},
    test: {},
    workspace: {},
    release: {}
  })
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