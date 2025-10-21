import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'devtools',
  version: '2.1.0',
  description: 'Developer productivity tools',
  
  // Codegen is automatically enabled with sensible defaults
  commands: {
    manifest: './commands/index.ts'
  },
  
  plugins: [],
  build: {
    entry: './cli.ts',
    outdir: './dist',
    targets: ['darwin-arm64', 'darwin-x64', 'linux-x64'],
    compress: true,
    minify: false,
    sourcemap: true
  }
})