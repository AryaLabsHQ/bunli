import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'bunli-tui-demo',
  version: '0.1.0',
  description: 'Example demonstrating Bunli TUI capabilities',
  
  // Codegen is automatically enabled with sensible defaults
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
