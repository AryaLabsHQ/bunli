import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'plugin-example-cli',
  version: '1.0.0',
  description: 'Example demonstrating Bunli plugins',
  
  // Codegen is automatically enabled with sensible defaults
  plugins: [],
  build: {
    entry: './cli.ts',
    outdir: './dist',
    targets: ['native'],
    compress: false,
    minify: false,
    sourcemap: true
  }
})
