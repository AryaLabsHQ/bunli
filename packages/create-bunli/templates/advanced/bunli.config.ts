import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: '{{name}}',
  version: '{{version}}',
  description: '{{description}}',
  
  plugins: [],
  
  build: {
    entry: './src/index.ts',
    outdir: './dist',
    targets: ['darwin-arm64', 'darwin-x64', 'linux-x64', 'windows-x64'],
    minify: true,
    sourcemap: true,
    compress: true
  },
  
  dev: {
    watch: true,
    inspect: false
  },
  
  test: {
    pattern: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: true,
    watch: false
  }
})
