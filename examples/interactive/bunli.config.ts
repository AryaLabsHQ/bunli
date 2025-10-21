import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'interactive-cli',
  version: '1.0.0',
  description: 'Example showing interactive prompts and user input',
  
  plugins: [],
  build: {
    entry: './cli.ts',
    outdir: './dist',
    targets: ['native'], // Build for current platform by default
    compress: false,
    minify: false,
    sourcemap: true
  },
  
  dev: {
    watch: true,
    inspect: false
  }
})