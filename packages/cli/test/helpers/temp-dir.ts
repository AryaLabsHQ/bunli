import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export function createTempFixtureDir(prefix: string): string {
  return realpathSync(mkdtempSync(path.join(tmpdir(), `${prefix}-`)))
}

export function removeTempFixtureDir(dir: string) {
  rmSync(dir, { recursive: true, force: true })
}
