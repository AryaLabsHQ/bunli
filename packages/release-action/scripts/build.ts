import { $ } from 'bun'
import { copyFileSync } from 'fs'

// Clean dist directory
await $`rm -rf dist`
await $`mkdir -p dist`

console.log('Building @bunli/release-action...')

// Bundle the action with all dependencies
const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node', // GitHub Actions run in Node.js environment
  format: 'esm',
  sourcemap: 'external',
  minify: false, // Keep readable for debugging
  external: [
    // Node built-ins that should not be bundled
    'fs',
    'path',
    'url',
    'util',
    'stream',
    'crypto',
    'http',
    'https',
    'zlib',
    'events',
    'buffer',
    'string_decoder',
    'child_process',
    'os',
    'assert',
    // GitHub Actions packages should be external
    '@actions/core',
    '@actions/github',
    '@actions/glob',
    '@octokit/rest'
  ]
})

if (!result.success) {
  console.error('Build failed:', result.logs)
  process.exit(1)
}

// Also generate TypeScript declarations
await $`bun run tsc --emitDeclarationOnly`

console.log('✅ @bunli/release-action built successfully')

// Copy action.yml to dist for easier consumption
copyFileSync('./action.yml', './dist/action.yml')