import { existsSync } from 'node:fs'
import path from 'node:path'

const COMMON_ENTRIES = [
  'src/cli.ts',
  'src/index.ts',
  'src/main.ts',
  'cli.ts',
  'index.ts',
  'main.ts',
  'src/cli.js',
  'src/index.js',
  'src/main.js',
  'cli.js',
  'index.js',
  'main.js'
]

export async function findEntry(cwd = process.cwd()): Promise<string | undefined> {
  // Check common entry points
  for (const entry of COMMON_ENTRIES) {
    const fullPath = path.join(cwd, entry)
    if (existsSync(fullPath)) {
      return entry
    }
  }
  
  // Check package.json bin field
  const pkgPath = path.join(cwd, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = await Bun.file(pkgPath).json()
      if (pkg.bin) {
        if (typeof pkg.bin === 'string') {
          return pkg.bin
        } else if (typeof pkg.bin === 'object') {
          // Return first bin entry
          const firstBin = Object.values(pkg.bin)[0]
          if (typeof firstBin === 'string') {
            return firstBin
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  return undefined
}