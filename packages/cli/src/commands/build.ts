import { defineCommand, option } from '@bunli/core'
import { Result, TaggedError } from 'better-result'
import { Generator } from '@bunli/generator'
import { bunliCodegenPlugin } from '@bunli/generator/plugin'
import { z } from 'zod'
import { loadConfig } from '@bunli/core'
import { findEntry } from '../utils/find-entry.js'
import { $ } from 'bun'
import path from 'node:path'
import type { BunliUtils } from '@bunli/utils'


const BuildCommandError = TaggedError('BuildCommandError')<{
  message: string
  cause?: unknown
}>()
type BuildCommandErrorType = InstanceType<typeof BuildCommandError>

const failBuild = (message: string, cause?: unknown): Result<never, BuildCommandErrorType> =>
  Result.err(new BuildCommandError({ message, cause }))

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
    const result = await runBuild(flags, spinner, colors)
    if (result.isErr()) {
      throw result.error
    }
  }
})

async function runBuild(
  flags: Record<string, unknown>,
  spinner: BunliUtils['spinner'],
  colors: BunliUtils['colors']
): Promise<Result<void, BuildCommandErrorType>> {
  const config = await loadConfig()

  const typedFlags = flags as {
    entry?: string
    outdir?: string
    outfile?: string
    minify?: boolean
    sourcemap?: boolean
    bytecode: boolean
    runtime?: 'bun' | 'node'
    targets?: string[]
  }

  const resolvedBuildEntry = typedFlags.entry || config.build?.entry || await findEntry()
  if (!resolvedBuildEntry) {
    return failBuild('No entry file found. Please specify with --entry or in bunli.config.ts')
  }

  const buildEntryPoints = Array.isArray(resolvedBuildEntry)
    ? resolvedBuildEntry
    : [resolvedBuildEntry]
  const primaryBuildEntry = buildEntryPoints[0]
  if (!primaryBuildEntry) {
    return failBuild('Entry file is undefined')
  }

  const configuredCodegenEntry = config.commands?.entry
  const codegenEntry = configuredCodegenEntry || primaryBuildEntry

  {
    const spin = spinner('Generating types...')
    const generator = new Generator({
      entry: codegenEntry,
      directory: config.commands?.directory,
      outputFile: './.bunli/commands.gen.ts',
      config,
      generateReport: config.commands?.generateReport
    })
    const generationResult = await generator.run()
    if (Result.isError(generationResult)) {
      spin.fail('Failed to generate types')
      return failBuild(generationResult.error.message, generationResult.error)
    }
    spin.succeed('Types generated')
  }

  const targets = typedFlags.targets || config.build?.targets
  const isCompiling = Boolean(targets && targets.length > 0)
  if (isCompiling && buildEntryPoints.length > 1) {
    return failBuild('Compiled builds only support a single entry file')
  }

  const entryFile = primaryBuildEntry

  const outdir = typedFlags.outdir || config.build?.outdir || './dist'
  const spin = spinner('Building CLI...')
  spin.start()

  try {
    await $`rm -rf ${outdir}`
    await $`mkdir -p ${outdir}`

    if (isCompiling) {
      spin.update('Compiling to standalone executable...')
      let platformTargets: string[] = []
      if (targets?.includes('all')) {
        platformTargets = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'windows-x64']
      } else if (targets?.includes('native')) {
        platformTargets = [`${process.platform}-${process.arch}`]
      } else {
        platformTargets = targets ?? []
      }

      for (const platform of platformTargets) {
        spin.update(`Compiling for ${platform}...`)
        const shouldCreateSubdir = platformTargets.length > 1
        const targetDir = shouldCreateSubdir ? path.join(outdir, platform) : outdir
        await $`mkdir -p ${targetDir}`

        const ext = path.extname(entryFile)
        const nameWithoutExt = ext ? entryFile.slice(0, -ext.length) : entryFile
        const baseName = path.basename(nameWithoutExt)
        const isWindows = platform.includes('windows')
        const outfile = typedFlags.outfile || path.join(targetDir, isWindows ? `${baseName}.exe` : baseName)

        const compileArgs = [
          'build',
          entryFile,
          '--compile',
          '--outfile', outfile,
          '--target', `bun-${platform}`
        ]

        if (typedFlags.minify ?? config.build?.minify ?? true) compileArgs.push('--minify')
        if (typedFlags.sourcemap ?? config.build?.sourcemap ?? false) compileArgs.push('--sourcemap')
        if (typedFlags.bytecode) compileArgs.push('--bytecode')

        const externals = config.build?.external || []
        for (const extModule of externals) {
          compileArgs.push('--external', extModule)
        }

        const result = await $`bun ${compileArgs}`.quiet()
        if (result.exitCode !== 0) {
          return failBuild(`Compilation failed for ${platform}`)
        }
      }

      if (config.build?.compress && platformTargets.length > 1) {
        spin.update('Compressing builds...')
        for (const platform of platformTargets) {
          await $`cd ${outdir} && tar -czf ${platform}.tar.gz ${platform}`
          await $`rm -rf ${outdir}/${platform}`
        }
      }
    } else {
      const result = await Bun.build({
        entrypoints: buildEntryPoints,
        outdir,
        target: typedFlags.runtime || 'bun',
        format: 'esm' as const,
        minify: typedFlags.minify ?? config.build?.minify ?? true,
        sourcemap: typedFlags.sourcemap ?? config.build?.sourcemap ?? false,
        external: config.build?.external || [],
        plugins: [
          bunliCodegenPlugin({
            entry: codegenEntry,
            directory: config.commands?.directory,
            outputFile: './.bunli/commands.gen.ts',
            config
          })
        ]
      })

      if (!result.success) {
        return failBuild(`Build failed: ${result.logs.join('\n')}`)
      }

      for (const output of result.outputs) {
        if (output.path.endsWith('.js')) {
          const content = await output.text()
          const runtime = typedFlags.runtime === 'node' ? 'node' : 'bun'
          const withoutShebang = content.replace(/^#![^\n]*\n/, '')
          const executableContent = `#!/usr/bin/env ${runtime}\n${withoutShebang}`
          await Bun.write(output.path, executableContent)
          await $`chmod +x ${output.path}`
        }
      }
    }

    spin.succeed('Build complete!')
    const stats = await $`du -sh ${outdir}`.text()
    console.log(colors.dim(`Output size: ${stats.trim()}`))
    return Result.ok(undefined)
  } catch (error) {
    spin.fail('Build failed')
    return failBuild(error instanceof Error ? error.message : String(error), error)
  }
}
