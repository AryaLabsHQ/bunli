import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'dev-server',
  version: '0.0.1',
  description: 'Development server with plugins - Advanced plugin system and configuration management',
  plugins: [],
  build: {
    entry: 'cli.ts',
    outdir: 'dist',
    targets: ['node16', 'bun'],
    compress: true,
    minify: true,
    sourcemap: false
  },
  dev: {
    watch: true,
    inspect: false
  }
})
