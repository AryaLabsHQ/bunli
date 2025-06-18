import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'schema-validation-cli',
  version: '1.0.0',
  description: 'Example demonstrating schema validation with Zod',
  
  build: {
    entry: './cli.ts',
    outdir: './dist',
  },
  
  dev: {
    watch: true
  },
})