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
