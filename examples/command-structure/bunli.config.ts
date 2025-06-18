import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'command-structure',
  version: '1.0.0',
  description: 'Example showing command structure and organization',
  commands: {
    manifest: './commands/index.ts'
  },
  build: {
    entry: './cli.ts',
    outdir: './dist',
    targets: ['darwin-arm64', 'darwin-x64', 'linux-x64'],
    compress: true
  }
})