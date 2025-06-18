import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'minimal-cli',
  version: '1.0.0',
  description: 'Minimal Bunli CLI example',
  
  build: {
    entry: './cli.ts',
    outdir: './dist'
  }
})