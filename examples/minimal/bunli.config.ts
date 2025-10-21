import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'minimal-cli',
  version: '1.0.0',
  description: 'Minimal Bunli CLI example',
  
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