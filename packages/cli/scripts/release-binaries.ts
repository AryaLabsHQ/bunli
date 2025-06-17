#!/usr/bin/env bun
/**
 * Build standalone executables for all platforms
 * Used for GitHub releases
 */

import { $ } from 'bun'
import path from 'node:path'

const version = process.argv[2] || 'latest'
const platforms = [
  'darwin-arm64',
  'darwin-x64', 
  'linux-arm64',
  'linux-x64',
  'windows-x64'
]

console.log(`🚀 Building bunli ${version} for all platforms...\n`)

const outdir = './release'

// Clean release directory
await $`rm -rf ${outdir}`
await $`mkdir -p ${outdir}`

// Build for each platform
for (const platform of platforms) {
  console.log(`📦 Building for ${platform}...`)
  
  const isWindows = platform.includes('windows')
  const ext = isWindows ? '.exe' : ''
  const filename = `bunli${ext}`
  
  try {
    await $`bun build ./src/cli.ts --compile --target bun-${platform} --outfile ${outdir}/${platform}/${filename} --minify`
    
    // Create tarball
    await $`cd ${outdir} && tar -czf bunli-${version}-${platform}.tar.gz ${platform}`
    await $`rm -rf ${outdir}/${platform}`
    
    console.log(`✅ Built bunli-${version}-${platform}.tar.gz`)
  } catch (error) {
    console.error(`❌ Failed to build for ${platform}:`, error)
  }
}

// Create checksums
console.log('\n📝 Generating checksums...')
await $`cd ${outdir} && shasum -a 256 *.tar.gz > checksums.txt`

console.log('\n✨ Release binaries ready in ./release/')
console.log('Files:')
const files = await $`ls -la ${outdir}`.text()
console.log(files)