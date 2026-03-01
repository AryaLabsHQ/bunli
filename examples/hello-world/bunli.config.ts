import { defineConfig, type BunliConfig, type BunliConfigInput } from '@bunli/core'

const config: BunliConfigInput = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'Hello World - Simplest possible Bunli CLI',
  
  plugins: [],
  commands: {
    entry: './cli.ts',
    directory: './commands'
  },
  build: {
    entry: './cli.ts',
    outdir: './dist',
    // Bundle mode (no standalone binary compile)
    targets: [],
    compress: false,
    minify: true,
    sourcemap: true
  },
  tui: {
    renderer: {
      // Showcase full-screen interactive behavior in the alternate buffer.
      bufferMode: 'alternate'
    }
  }
}

const bunliConfig: BunliConfig = defineConfig(config)

export default bunliConfig
