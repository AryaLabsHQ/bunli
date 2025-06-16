#!/usr/bin/env bun
import { $ } from 'bun'
import { join } from 'path'

console.log('🔨 Building all packages...\n')

const packages = [
  'bunli',
  'create-bunli',
  'cli',
  'utils',
  'test'
]

for (const pkg of packages) {
  console.log(`📦 Building ${pkg}...`)
  
  const pkgPath = join(import.meta.dir, '..', 'packages', pkg)
  const buildScript = join(pkgPath, 'build.ts')
  
  // Check if package has a build script
  const buildScriptExists = await Bun.file(buildScript).exists()
  
  if (buildScriptExists) {
    try {
      await $`cd ${pkgPath} && bun build.ts`
      console.log(`✅ ${pkg} built successfully\n`)
    } catch (error) {
      console.error(`❌ Failed to build ${pkg}:`, error)
      process.exit(1)
    }
  } else {
    console.log(`⏭️  ${pkg} has no build script, skipping...\n`)
  }
}

console.log('✨ All packages built successfully!')