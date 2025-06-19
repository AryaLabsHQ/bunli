import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { BunliReleaseConfig, ReleaseContext } from '../types.js'

const execAsync = promisify(exec)

export class NPMPublisher {
  constructor(
    private config: BunliReleaseConfig,
    private npmToken: string
  ) {}

  async publish(context: ReleaseContext): Promise<void> {
    if (!this.config.npm?.publish) {
      return
    }

    // TODO: Implement NPM publishing
    console.log('Publishing to NPM:', context.version)
    
    // Set up NPM authentication
    const npmrcPath = join(homedir(), '.npmrc')
    const npmrcContent = `//registry.npmjs.org/:_authToken=${this.npmToken}\n`
    await writeFile(npmrcPath, npmrcContent, { mode: 0o600 })
    
    // Publish
    const access = this.config.npm.access || 'public'
    const tag = this.config.npm.tag || 'latest'
    
    console.log(`Would run: npm publish --access ${access} --tag ${tag}`)
  }
}