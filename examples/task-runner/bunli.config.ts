import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'task-runner',
  version: '1.0.0',
  description: 'Task automation CLI with validation and interactivity',
  
  plugins: [],
  commands: {
    directory: './commands'
  },
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
  }
})
