#!/usr/bin/env bun
import { $ } from 'bun'

console.log('🔨 Building bunli CLI...')

// Clean dist directory
await $`rm -rf dist`
await $`mkdir -p dist`

// Build the CLI using Bun's compile feature if requested
const useCompile = process.argv.includes('--compile')

if (useCompile) {
  console.log('📦 Creating standalone executable...')
  
  // Compile to standalone executable
  const compileArgs = [
    'build',
    './src/cli.ts',
    '--compile',
    '--outfile', './dist/bunli',
    '--minify'
  ]
  
  const compileResult = await $`bun ${compileArgs}`
  
  if (compileResult.exitCode !== 0) {
    console.error('❌ Compilation failed')
    process.exit(1)
  }
} else {
  // Traditional build for npm distribution
  const result = await Bun.build({
    entrypoints: ['./src/cli.ts'],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    minify: true,
    external: ['@bunli/core', '@bunli/utils', 'zod', 'glob']
  })

  if (!result.success) {
    console.error('❌ Build failed:', result.logs)
    process.exit(1)
  }

  // Make CLI executable
  const cliContent = await Bun.file('./dist/cli.js').text()
  // Only add shebang if it doesn't already have one
  const finalContent = cliContent.startsWith('#!') ? cliContent : `#!/usr/bin/env bun\n${cliContent}`
  await Bun.write('./dist/cli.js', finalContent)
  await $`chmod +x dist/cli.js`
}

// Build library
const libResult = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  minify: false,
  external: ['@bunli/core', '@bunli/utils', 'zod', 'glob']
})

if (!libResult.success) {
  console.error('❌ Library build failed:', libResult.logs)
  process.exit(1)
}

console.log('✅ Build complete!')

// Show build stats
const stats = await $`du -sh dist`.text()
console.log(`📦 Output size: ${stats.trim()}`)