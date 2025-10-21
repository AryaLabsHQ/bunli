import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'minimal-cli',
  version: '1.0.0',
  description: 'Minimal Bunli CLI example',
  
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