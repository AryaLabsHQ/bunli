import { defineCommand, option } from '@bunli/core'
import { Generator } from '@bunli/generator'
import { bunliCodegenPlugin } from '@bunli/generator/plugin'
import { z } from 'zod'
import { loadConfig } from '@bunli/core'
import { findEntry } from '../utils/find-entry.js'
import { $ } from 'bun'
import path from 'node:path'

export default defineCommand({
  name: 'build',
  description: 'Build your CLI for production',
  alias: 'b',
  options: {
    entry: option(
      z.string().optional(),
      { short: 'e', description: 'Entry file (defaults to auto-detect)' }
    ),
    outdir: option(
      z.string().optional(),
      { short: 'o', description: 'Output directory' }
    ),
    outfile: option(
      z.string().optional(),
      { description: 'Output filename (for single executable)' }
    ),
    minify: option(
      z.boolean().optional(),
      { short: 'm', description: 'Minify output' }
    ),
    sourcemap: option(
      z.boolean().optional(),
      { short: 's', description: 'Generate sourcemaps' }
    ),
    bytecode: option(
      z.boolean().default(false),
      { description: 'Enable bytecode compilation (experimental)' }
    ),
    runtime: option(
      z.enum(['bun', 'node']).optional(),
      { short: 'r', description: 'Runtime target (for non-compiled builds)' }
    ),
    targets: option(
      z.string().optional().transform((val) => {
        if (!val) return undefined
        // Split comma-separated values into array
        return val.split(',').map(t => t.trim())
      }),
      { short: 't', description: 'Target platforms for compilation (e.g., darwin-arm64,linux-x64)' }
    ),
    watch: option(
      z.boolean().default(false),
      { short: 'w', description: 'Watch for changes' }
    )
  },
  handler: async ({ flags, spinner, colors }) => {
    const config = await loadConfig()
    
    // 1. Run codegen before build (always enabled)
    {
      const spin = spinner('Generating types...')
      try {
        const generator = new Generator({
          commandsDir: config.commands?.directory || 'commands',
          outputFile: './.bunli/commands.gen.ts',
          config,
          generateReport: config.commands?.generateReport
        })
        await generator.run()
        spin.succeed('Types generated')
      } catch (error) {
        spin.fail('Failed to generate types')
        const message = error instanceof Error ? error.message : String(error)
        console.error(colors.red(message))
        return
      }
    }
    
    // 2. Determine entry point
    const entry = flags.entry || config.build?.entry || await findEntry()
    if (!entry) {
      console.error(colors.red('No entry file found. Please specify with --entry or in bunli.config.ts'))
      process.exit(1)
    }
    
    // Determine targets - from flags, config, or none (traditional build)
    const targets = flags.targets || config.build?.targets
    
    const isCompiling = targets && targets.length > 0
    
    // For compiled builds, we only support single entry
    if (isCompiling && Array.isArray(entry)) {
      console.error(colors.red('Compiled builds only support a single entry file'))
      process.exit(1)
    }
    
    const entryFile = Array.isArray(entry) ? entry[0] : entry
    if (!entryFile) {
      console.error(colors.red('Entry file is undefined'))
      process.exit(1)
    }
    const outdir = flags.outdir || config.build?.outdir || './dist'
    
    const spin = spinner('Building CLI...')
    spin.start()
    
    try {
      // Clean output directory
      await $`rm -rf ${outdir}`
      await $`mkdir -p ${outdir}`
      
      if (isCompiling) {
        // Use Bun's compile feature for standalone executables
        spin.update('Compiling to standalone executable...')
        
        // Normalize targets (we know targets is defined here because isCompiling is true)
        let platformTargets: string[] = []
        if (targets!.includes('all')) {
          platformTargets = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'windows-x64']
        } else if (targets!.includes('native')) {
          platformTargets = [`${process.platform}-${process.arch}`]
        } else {
          platformTargets = targets!
        }
        
        // Build for each target platform
        for (const platform of platformTargets) {
          spin.update(`Compiling for ${platform}...`)
          
          const shouldCreateSubdir = platformTargets.length > 1
          const targetDir = shouldCreateSubdir ? path.join(outdir, platform) : outdir
          await $`mkdir -p ${targetDir}`
          
          // Determine output filename
          const ext = path.extname(entryFile)
          const nameWithoutExt = ext ? entryFile.slice(0, -ext.length) : entryFile
          const baseName = path.basename(nameWithoutExt)
          const isWindows = platform.includes('windows')
          const outfile = flags.outfile || path.join(targetDir, isWindows ? `${baseName}.exe` : baseName)
          
          // Build compile command
          const compileArgs = [
            'build',
            entryFile,
            '--compile',
            '--outfile', outfile,
            '--target', `bun-${platform}`  // Bun requires the bun- prefix
          ]
          
          if (flags.minify ?? config.build?.minify ?? true) {
            compileArgs.push('--minify')
          }
          
          if (flags.sourcemap ?? config.build?.sourcemap ?? false) {
            compileArgs.push('--sourcemap')
          }
          
          if (flags.bytecode) {
            compileArgs.push('--bytecode')
          }
          
          // Add external modules
          const externals = config.build?.external || []
          for (const ext of externals) {
            compileArgs.push('--external', ext)
          }
          
          const result = await $`bun ${compileArgs}`.quiet()
          
          if (result.exitCode !== 0) {
            throw new Error(`Compilation failed for ${platform}`)
          }
        }
        
        // Compress if configured and multiple targets
        if (config.build?.compress && platformTargets.length > 1) {
          spin.update('Compressing builds...')
          for (const platform of platformTargets) {
            await $`cd ${outdir} && tar -czf ${platform}.tar.gz ${platform}`
            await $`rm -rf ${outdir}/${platform}`
          }
        }
      } else {
        // Traditional Bun.build() for non-executable builds
        const entryFiles = Array.isArray(entry) ? entry : [entry]
        
        const buildOptions = {
          entrypoints: entryFiles,
          outdir,
          target: flags.runtime || 'bun',
          format: 'esm' as const,
          minify: flags.minify ?? config.build?.minify ?? true,
          sourcemap: flags.sourcemap ?? config.build?.sourcemap ?? false,
          external: config.build?.external || [],
          // Add codegen plugin for automatic type generation (always enabled)
          plugins: [
            bunliCodegenPlugin({
              commandsDir: config.commands?.directory || 'commands',
              outputFile: './.bunli/commands.gen.ts',
              config
            })
          ]
        }
        
        const result = await Bun.build(buildOptions)
        
        if (!result.success) {
          throw new Error(`Build failed: ${result.logs.join('\\n')}`)
        }
        
        // Make executable if CLI
        for (const output of result.outputs) {
          if (output.path.endsWith('.js')) {
            const content = await output.text()
            const runtime = flags.runtime === 'node' ? 'node' : 'bun'
            const executableContent = `#!/usr/bin/env ${runtime}\n${content}`
            await Bun.write(output.path, executableContent)
            await $`chmod +x ${output.path}`
          }
        }
      }
      
      spin.succeed('Build complete!')
      
      // Show build stats
      const stats = await $`du -sh ${outdir}`.text()
      console.log(colors.dim(`Output size: ${stats.trim()}`))
      
    } catch (error) {
      spin.fail('Build failed')
      console.error(colors.red(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }
  }
})