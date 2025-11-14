import type { CommandMetadata } from '@bunli/generator'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'

export async function loadMetadata(): Promise<CommandMetadata[]> {
  try {
    // Import the generated file
    const genPath = resolve(process.cwd(), '.bunli/commands.gen.ts')
    const module = await import(genPath)

    // Extract metadata from the generated module
    const metadataList = module.generated?.list() || []
    return metadataList.map((item: any) => item.metadata)
  } catch (error) {
    throw new Error(
      'Could not load command metadata. Make sure you have run "bun run generate" first.'
    )
  }
}

export async function getCLIName(): Promise<string> {
  try {
    const pkgPath = resolve(process.cwd(), 'package.json')
    const pkgContent = await readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(pkgContent)
    return pkg.name || 'cli'
  } catch {
    return 'cli'
  }
}
