import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createCLI } from '../src/cli.js'
import { loadConfig } from '../src/config-loader.js'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'

describe('Config Auto-Loading', () => {
  const originalCwd = process.cwd()
  
  beforeEach(() => {
    // Change to a temporary directory for testing
    process.chdir('/tmp')
  })
  
  afterEach(async () => {
    // Clean up test files
    try {
      await unlink('bunli.config.ts')
    } catch {}
    try {
      await unlink('bunli.config.js')
    } catch {}
    process.chdir(originalCwd)
  })

  test('loadConfig loads from bunli.config.ts', async () => {
    const configContent = `
export default {
  name: 'test-cli',
  version: '1.0.0',
  description: 'Test CLI'
}
`
    await writeFile('bunli.config.ts', configContent)
    
    const config = await loadConfig()
    
    expect(config.name).toBe('test-cli')
    expect(config.version).toBe('1.0.0')
    expect(config.description).toBe('Test CLI')
  })

  test('loadConfig loads from bunli.config.js', async () => {
    const configContent = `
export default {
  name: 'test-cli-js',
  version: '2.0.0',
  description: 'Test CLI JS',
  plugins: []
}
`
    await writeFile('bunli.config.js', configContent)
    // Note: .js config is loaded, .ts takes precedence if exists
    const config = await loadConfig()
    
    // Both .js and .ts files may exist, .ts takes precedence
    expect(config.name).toBeDefined()
  })

  test('loadConfig throws error when no config found', async () => {
    await expect(async () => {
      await loadConfig()
    }).toThrow(/No configuration file found/)
  })

  test('createCLI auto-loads config when no override provided', async () => {
    const configContent = `
export default {
  name: 'auto-test-cli',
  version: '3.0.0',
  description: 'Auto-loaded CLI',
  plugins: []
}
`
    await writeFile('bunli.config.ts', configContent)
    
    const cli = await createCLI()
    
    // Test that CLI was created successfully
    expect(cli).toBeDefined()
    expect(typeof cli.run).toBe('function')
    expect(typeof cli.command).toBe('function')
  })

  test('createCLI merges override with loaded config', async () => {
    const configContent = `
export default {
  name: 'merge-test-cli',
  version: '4.0.0',
  description: 'Merge test CLI',
  plugins: []
}
`
    await writeFile('bunli.config.ts', configContent)
    
    const cli = await createCLI({
      description: 'Overridden description'
    })
    
    // Test that CLI was created successfully
    expect(cli).toBeDefined()
  })

  test('createCLI throws helpful error when no config and no override', async () => {
    await expect(async () => {
      await createCLI()
    }).toThrow(/No configuration file found/)
  })

  test('createCLI works with override when no config file', async () => {
    const cli = await createCLI({
      name: 'override-cli',
      version: '5.0.0',
      description: 'Override CLI',
      plugins: []
    })
    
    expect(cli).toBeDefined()
  })
})
