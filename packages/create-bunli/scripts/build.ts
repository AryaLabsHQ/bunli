#!/usr/bin/env bun
import { $ } from 'bun'

// Clean and create dist directory
await $`rm -rf dist`
await $`mkdir -p dist`

// Build TypeScript files
await Bun.build({
  entrypoints: ['./src/cli.ts', './src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  minify: false,
  external: ['@bunli/core', '@bunli/utils', 'zod', 'giget']
})

// Copy templates directory to dist
await $`cp -r templates dist/templates 2>/dev/null || true`

// Make CLI executable
await $`chmod +x dist/cli.js`

// Add shebang to CLI file
const cliContent = await Bun.file('./dist/cli.js').text()
const finalContent = cliContent.startsWith('#!') ? cliContent : `#!/usr/bin/env bun\n${cliContent}`
await Bun.write('./dist/cli.js', finalContent)

console.log('✅ create-bunli built successfully')