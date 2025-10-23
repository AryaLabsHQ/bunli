import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'hello-world',
  version: '1.0.0',
  description: 'Hello World - Simplest possible Bunli CLI',
  
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
  }
})