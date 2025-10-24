#!/usr/bin/env bun
import { $ } from 'bun'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

interface PackageInfo {
  name: string
  version: string
  path: string
  hasBin: boolean
  publishable: boolean
}

async function getAllPackages(): Promise<PackageInfo[]> {
  const packages: PackageInfo[] = []
  const packagesDir = join(process.cwd(), 'packages')
  
  try {
    const entries = await readdir(packagesDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packagePath = join(packagesDir, entry.name)
        const packageJsonPath = join(packagePath, 'package.json')
        
        try {
          const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
          
          packages.push({
            name: packageJson.name,
            version: packageJson.version,
            path: packagePath,
            hasBin: !!packageJson.bin,
            publishable: !packageJson.private && packageJson.name.startsWith('@bunli/')
          })
        } catch (error) {
          console.warn(`⚠️  Could not read package.json for ${entry.name}:`, error)
        }
      }
    }
  } catch (error) {
    console.error('❌ Error reading packages directory:', error)
    process.exit(1)
  }
  
  return packages
}

async function updatePackageVersion(packagePath: string, newVersion: string): Promise<void> {
  const packageJsonPath = join(packagePath, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
  
  packageJson.version = newVersion
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
}

async function runTests(): Promise<boolean> {
  console.log('🧪 Running tests...')
  try {
    await $`bun test`
    console.log('✅ All tests passed')
    return true
  } catch (error) {
    console.error('❌ Tests failed:', error)
    return false
  }
}

async function buildPackages(): Promise<boolean> {
  console.log('🔨 Building packages...')
  try {
    await $`bun run build`
    console.log('✅ All packages built successfully')
    return true
  } catch (error) {
    console.error('❌ Build failed:', error)
    return false
  }
}

async function publishPackages(packages: PackageInfo[]): Promise<void> {
  const publishablePackages = packages.filter(p => p.publishable)
  
  if (publishablePackages.length === 0) {
    console.log('ℹ️  No publishable packages found')
    return
  }
  
  console.log(`📦 Publishing ${publishablePackages.length} packages...`)
  
  for (const pkg of publishablePackages) {
    console.log(`📤 Publishing ${pkg.name}@${pkg.version}...`)
    try {
      await $`cd ${pkg.path} && bun publish --access public`
      console.log(`✅ Published ${pkg.name}@${pkg.version}`)
    } catch (error) {
      console.error(`❌ Failed to publish ${pkg.name}:`, error)
      throw error
    }
  }
}

async function createGitTag(version: string): Promise<void> {
  console.log(`🏷️  Creating git tag v${version}...`)
  try {
    await $`git add .`
    await $`git commit -m "chore: release v${version}"`
    await $`git tag v${version}`
    console.log(`✅ Created tag v${version}`)
  } catch (error) {
    console.error('❌ Failed to create git tag:', error)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const version = args[0]
  
  if (!version) {
    console.log('📦 Bunli Release Script')
    console.log('')
    console.log('Usage: bun scripts/release.ts <version>')
    console.log('')
    console.log('Examples:')
    console.log('  bun scripts/release.ts 0.2.0')
    console.log('  bun scripts/release.ts 0.2.1')
    console.log('  bun scripts/release.ts 1.0.0')
    console.log('')
    console.log('This script will:')
    console.log('1. Run tests')
    console.log('2. Build all packages')
    console.log('3. Update version numbers')
    console.log('4. Publish to npm')
    console.log('5. Create git tags')
    process.exit(1)
  }
  
  console.log(`🚀 Starting release process for version ${version}`)
  console.log('')
  
  // Get all packages
  const packages = await getAllPackages()
  console.log(`📋 Found ${packages.length} packages:`)
  packages.forEach(pkg => {
    const status = pkg.publishable ? '📦' : '🔒'
    console.log(`  ${status} ${pkg.name}@${pkg.version}`)
  })
  console.log('')
  
  // Run tests
  if (!(await runTests())) {
    console.log('❌ Release aborted due to test failures')
    process.exit(1)
  }
  console.log('')
  
  // Build packages
  if (!(await buildPackages())) {
    console.log('❌ Release aborted due to build failures')
    process.exit(1)
  }
  console.log('')
  
  // Update versions
  console.log(`📝 Updating all packages to version ${version}...`)
  for (const pkg of packages) {
    await updatePackageVersion(pkg.path, version)
    console.log(`✅ Updated ${pkg.name} to ${version}`)
  }
  console.log('')
  
  // Publish packages
  await publishPackages(packages)
  console.log('')
  
  // Create git tag
  await createGitTag(version)
  console.log('')
  
  console.log('🎉 Release completed successfully!')
  console.log(`📦 Published version ${version}`)
  console.log('🏷️  Git tag created')
  console.log('')
  console.log('Next steps:')
  console.log('  git push origin main --tags')
}

main().catch(error => {
  console.error('❌ Release failed:', error)
  process.exit(1)
})