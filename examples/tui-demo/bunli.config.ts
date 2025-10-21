import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'bunli-tui-demo',
  version: '0.1.0',
  description: 'Example demonstrating Bunli TUI capabilities',
  
  commands: {
    directory: 'src/commands'
  },
  plugins: [],
  
  build: {
    entry: 'src/index.ts',
    outdir: 'dist',
    targets: ['bun'],
    compress: false,
    minify: false,
    sourcemap: true
  },
  
  dev: {
    watch: true,
    inspect: false
  }
})
