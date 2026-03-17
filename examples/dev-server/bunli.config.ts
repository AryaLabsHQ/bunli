import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'dev-server',
  version: '0.0.1',
  description: 'Development server with plugins - Advanced plugin system and configuration management',
  plugins: [],
  commands: {
    entry: './cli.ts',
    directory: './commands'
  },
  build: {
    entry: 'cli.ts',
    outdir: 'dist',
    // Native standalone binary optimized for local usage
    targets: ['native'],
    compress: false,
    minify: true,
    sourcemap: false
  },
  dev: {
    watch: true,
    inspect: false
  },
  test: {
    pattern: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: false,
    watch: false
  },
  workspace: {
    versionStrategy: 'fixed' as const
  },
  release: {
    npm: true,
    github: false,
    tagFormat: 'v{{version}}',
    conventionalCommits: true
  }
})
