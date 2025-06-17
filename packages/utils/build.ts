import { $ } from 'bun'

// Clean dist directory
await $`rm -rf dist`
await $`mkdir -p dist`

// Build with Bun instead of tsc for now
const entrypoints = ['./src/index.ts']

for (const entry of entrypoints) {
  await Bun.build({
    entrypoints: [entry],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    external: ['bun']
  })
}

// Also generate TypeScript declarations
await $`tsc`

console.log('✅ @bunli/utils built successfully')