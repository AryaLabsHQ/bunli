import { test, expect } from 'bun:test'
import { defineConfig, bunliConfigSchema } from '../../core/src/config.js'

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
  expect(result.build.targets).toEqual([])
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
