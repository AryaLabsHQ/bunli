import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: '{{name}}',
  version: '{{version}}',
  description: '{{description}}',
  
  build: {
    entry: './src/index.ts',
    outdir: './dist',
    targets: ['native'],
    minify: true,
    sourcemap: true,
    compress: false
  },
  
  dev: {
    watch: true,
    inspect: true
  },
  
  test: {
    pattern: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: true,
    watch: false
  },

  plugins: [],
})
