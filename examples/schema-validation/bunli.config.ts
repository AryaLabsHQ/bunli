import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'schema-validation-cli',
  version: '1.0.0',
  description: 'Example demonstrating schema validation with Zod',
  
  // Codegen is automatically enabled with sensible defaults
  plugins: [],
  build: {
    entry: './cli.ts',
    outdir: './dist',
    targets: ['native'],
    compress: false,
    minify: false,
    sourcemap: true
  },
  
  dev: {
    watch: true,
    inspect: false
  },
})