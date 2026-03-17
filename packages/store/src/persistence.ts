import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { StoreReadError, StoreWriteError, StoreParseError } from './errors.js'

function isEnoent(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: unknown }).code === 'ENOENT'
  )
}

async function cleanupTempFile(tempPath: string): Promise<void> {
  try {
    await rm(tempPath, { force: true })
  } catch {
    // Best-effort cleanup
  }
}

export async function readJson(filePath: string): Promise<unknown | undefined> {
  let raw: string

  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return undefined
    }
    throw new StoreReadError({
      message: `Failed to read store file: ${filePath}`,
      path: filePath,
      cause: err,
    })
  }

  try {
    return JSON.parse(raw)
  } catch (err: unknown) {
    throw new StoreParseError({
      message: `Malformed JSON in store file: ${filePath}`,
      path: filePath,
      cause: err,
    })
  }
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  const dir = dirname(filePath)
  const tempPath = join(dir, `.store-${randomUUID()}.tmp`)

  try {
    await mkdir(dir, { recursive: true })
  } catch (err: unknown) {
    throw new StoreWriteError({
      message: `Failed to create store directory: ${dir}`,
      path: filePath,
      cause: err,
    })
  }

  try {
    const json = JSON.stringify(data, null, '\t')
    await writeFile(tempPath, json, 'utf-8')
  } catch (err: unknown) {
    await cleanupTempFile(tempPath)
    throw new StoreWriteError({
      message: `Failed to write store file: ${filePath}`,
      path: filePath,
      cause: err,
    })
  }

  try {
    await rename(tempPath, filePath)
  } catch (err: unknown) {
    await cleanupTempFile(tempPath)
    throw new StoreWriteError({
      message: `Failed to finalize store file: ${filePath}`,
      path: filePath,
      cause: err,
    })
  }
}

export async function deleteJson(filePath: string): Promise<void> {
  try {
    await unlink(filePath)
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return
    }
    throw new StoreWriteError({
      message: `Failed to delete store file: ${filePath}`,
      path: filePath,
      cause: err,
    })
  }
}
