import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { z } from 'zod'
import { file, directory } from '../src/fs-validators.js'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let tempDir: string

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'bunli-fs-test-'))
  await writeFile(join(tempDir, 'test.json'), '{}')
  await writeFile(join(tempDir, 'data.csv'), 'a,b')
  await mkdir(join(tempDir, 'subdir'))
})

afterAll(async () => {
  await rm(tempDir, { recursive: true })
})

describe('file validator', () => {
  test('passes through valid string when no constraints', async () => {
    const schema = file(z.string())
    const result = await schema['~standard'].validate('/some/path.txt')
    expect(result.issues).toBeUndefined()
    expect('value' in result && result.value).toBe('/some/path.txt')
  })

  test('rejects non-string values via inner schema', async () => {
    const schema = file(z.string())
    const result = await schema['~standard'].validate(123)
    expect(result.issues).toBeDefined()
    expect(result.issues!.length).toBeGreaterThan(0)
  })

  test('validates mustExist for existing file', async () => {
    const schema = file(z.string(), { mustExist: true })
    const path = join(tempDir, 'test.json')
    const result = await schema['~standard'].validate(path)
    expect(result.issues).toBeUndefined()
    expect('value' in result && result.value).toBe(path)
  })

  test('rejects mustExist for nonexistent file', async () => {
    const schema = file(z.string(), { mustExist: true })
    const result = await schema['~standard'].validate(join(tempDir, 'nonexistent.txt'))
    expect(result.issues).toBeDefined()
    expect(result.issues![0]!.message).toContain('does not exist')
  })

  test('rejects mustExist when path is a directory', async () => {
    const schema = file(z.string(), { mustExist: true })
    const result = await schema['~standard'].validate(join(tempDir, 'subdir'))
    expect(result.issues).toBeDefined()
    expect(result.issues![0]!.message).toContain('not a file')
  })

  test('validates allowed extensions', async () => {
    const schema = file(z.string(), { extensions: ['.json', '.yaml'] })
    const result = await schema['~standard'].validate('/path/to/config.json')
    expect(result.issues).toBeUndefined()
  })

  test('rejects disallowed extensions', async () => {
    const schema = file(z.string(), { extensions: ['.json', '.yaml'] })
    const result = await schema['~standard'].validate('/path/to/data.csv')
    expect(result.issues).toBeDefined()
    expect(result.issues![0]!.message).toContain('extensions')
  })

  test('combines mustExist and extensions', async () => {
    const schema = file(z.string(), { mustExist: true, extensions: ['.json'] })
    const path = join(tempDir, 'test.json')
    const result = await schema['~standard'].validate(path)
    expect(result.issues).toBeUndefined()
  })

  test('checks extension before existence', async () => {
    const schema = file(z.string(), { mustExist: true, extensions: ['.yaml'] })
    const result = await schema['~standard'].validate(join(tempDir, 'test.json'))
    expect(result.issues).toBeDefined()
    expect(result.issues![0]!.message).toContain('extensions')
  })
})

describe('directory validator', () => {
  test('passes through valid string when no constraints', async () => {
    const schema = directory(z.string())
    const result = await schema['~standard'].validate('/some/dir')
    expect(result.issues).toBeUndefined()
  })

  test('validates mustExist for existing directory', async () => {
    const schema = directory(z.string(), { mustExist: true })
    const result = await schema['~standard'].validate(join(tempDir, 'subdir'))
    expect(result.issues).toBeUndefined()
  })

  test('rejects mustExist for nonexistent directory', async () => {
    const schema = directory(z.string(), { mustExist: true })
    const result = await schema['~standard'].validate(join(tempDir, 'nonexistent'))
    expect(result.issues).toBeDefined()
    expect(result.issues![0]!.message).toContain('does not exist')
  })

  test('rejects mustExist when path is a file', async () => {
    const schema = directory(z.string(), { mustExist: true })
    const result = await schema['~standard'].validate(join(tempDir, 'test.json'))
    expect(result.issues).toBeDefined()
    expect(result.issues![0]!.message).toContain('not a directory')
  })
})
