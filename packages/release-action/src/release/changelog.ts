import type { BunliReleaseConfig } from '../types.js'

export class ChangelogGenerator {
  constructor(
    private config: BunliReleaseConfig,
    private githubToken: string
  ) {}

  async generate(tag: string): Promise<string> {
    // TODO: Implement changelog generation
    console.log('Generating changelog for', tag)
    
    return `## What's Changed

* Feature: Initial release
* Fix: Various bug fixes
* Docs: Updated documentation

**Full Changelog**: https://github.com/owner/repo/commits/${tag}`
  }
}