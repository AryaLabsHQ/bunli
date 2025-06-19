import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)
import { createHash } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import { join, basename } from 'path'
import type { BunliReleaseConfig, BuildArtifact, ReleaseContext, Platform } from '../types.js'
import { SUPPORTED_PLATFORMS, parsePlatform, getFileExtension } from '../types.js'
import { TemplateEngine } from '../utils/template.js'

export class Builder {
  constructor(private config: BunliReleaseConfig) {}

  async buildAll(context: ReleaseContext): Promise<BuildArtifact[]> {
    const artifacts: BuildArtifact[] = []
    
    for (const buildConfig of this.config.builds || []) {
      const targets = this.resolveTargets(buildConfig.targets)
      
      for (const target of targets) {
        const artifact = await this.buildTarget(target, buildConfig, context)
        artifacts.push(artifact)
      }
    }
    
    return artifacts
  }

  async generateChecksums(artifacts: BuildArtifact[]): Promise<void> {
    if (!this.config.checksum) return

    const checksums: string[] = []
    const algorithm = this.config.checksum.algorithm || 'sha256'

    for (const artifact of artifacts) {
      const content = await readFile(artifact.path)
      const hash = createHash(algorithm)
      hash.update(content)
      const checksum = hash.digest('hex')
      
      artifact.checksum = checksum
      checksums.push(`${checksum}  ${basename(artifact.path)}`)
    }

    // Write checksums file
    const checksumFile = this.config.checksum.name_template || 'checksums.txt'
    await writeFile(checksumFile, checksums.join('\n'))
  }

  private resolveTargets(targets?: string[] | 'all' | 'native'): Platform[] {
    if (!targets || targets === 'all') {
      return [...SUPPORTED_PLATFORMS]
    }
    
    if (targets === 'native') {
      // Detect current platform
      const platform = `${process.platform}-${process.arch}` as Platform
      return [platform]
    }
    
    return targets as Platform[]
  }

  private async buildTarget(
    target: Platform,
    buildConfig: any,
    context: ReleaseContext
  ): Promise<BuildArtifact> {
    const { os, arch } = parsePlatform(target)
    const ext = getFileExtension(os)
    
    // Create template context
    const templateContext = TemplateEngine.createContext({
      ProjectName: context.projectName,
      Version: context.version,
      Tag: context.tag,
      Date: context.date,
      Commit: context.commit,
      OS: os,
      Arch: arch,
      Ext: ext,
      Env: context.env
    })
    
    const engine = new TemplateEngine(templateContext)
    
    // Determine output name
    const outputTemplate = buildConfig.output || '{{.ProjectName}}-{{.Version}}-{{.OS}}-{{.Arch}}{{.Ext}}'
    const outputName = engine.render(outputTemplate)
    
    // TODO: Implement actual Bun compilation
    console.log(`Building ${target} -> ${outputName}`)
    
    // For now, create a placeholder
    const outputPath = join('dist', outputName)
    await execAsync('mkdir -p dist')
    await writeFile(outputPath, `Placeholder for ${target}`)
    
    return {
      path: outputPath,
      name: outputName,
      platform: os,
      arch: arch,
      size: 0 // Will be set after actual build
    }
  }
}