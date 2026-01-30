import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'hello-world',
  version: '1.0.0',
  description: 'Hello World - Simplest possible Bunli CLI',
  
  plugins: [],
  commands: {
    directory: './commands'
  }
})