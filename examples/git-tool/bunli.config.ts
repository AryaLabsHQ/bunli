import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'git-tool',
  version: '1.0.0',
  description: 'Git workflow automation CLI',
  
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
