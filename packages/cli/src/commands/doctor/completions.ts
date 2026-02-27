import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

interface GeneratedStoreModule {
  generated?: {
    list?: () => Array<{
      name: string
      metadata?: {
        name?: string
        options?: Record<string, unknown>
        commands?: Array<unknown>
      }
    }>
  }
}

export default defineCommand({
  name: 'completions',
  description: 'Validate generated completion metadata and command graph shape',
  options: {
    generatedPath: option(z.string().default('./.bunli/commands.gen.ts'), {
      description: 'Path to generated command metadata module'
    }),
    strict: option(z.boolean().default(false), {
      description: 'Fail if any warnings are found'
    })
  },
  async handler({ flags, colors }) {
    const generatedPath = String(flags.generatedPath)
    const strict = Boolean(flags.strict)
    const absolutePath = resolve(process.cwd(), generatedPath)

    const generatedFile = Bun.file(absolutePath)
    if (!(await generatedFile.exists())) {
      throw new Error(`Missing generated metadata file: ${generatedPath}. Run "bunli generate" first.`)
    }

    const url = pathToFileURL(absolutePath).href
    const imported = await import(url) as GeneratedStoreModule
    const list = imported.generated?.list

    if (typeof list !== 'function') {
      throw new Error(
        `Generated module at ${generatedPath} is missing generated.list(). Regenerate with "bunli generate".`
      )
    }

    const entries = list()
    const warnings: string[] = []
    const errors: string[] = []

    if (entries.length === 0) {
      warnings.push('No commands found in generated metadata.')
    }

    const normalizedNames = new Set<string>()
    for (const entry of entries) {
      const runtimeName = typeof entry.name === 'string' ? entry.name.trim() : ''
      const metadataName = typeof entry.metadata?.name === 'string' ? entry.metadata.name.trim() : ''
      const effectiveName = metadataName || runtimeName

      if (!effectiveName) {
        errors.push('Found command entry with empty name in generated metadata.')
        continue
      }

      if (normalizedNames.has(effectiveName)) {
        errors.push(`Duplicate command metadata name detected: "${effectiveName}"`)
      } else {
        normalizedNames.add(effectiveName)
      }
    }

    const hasNestedPath = Array.from(normalizedNames).some((name) => name.includes('/') || name.includes(' '))
    if (hasNestedPath && !Array.from(normalizedNames).some((name) => name.includes('/'))) {
      warnings.push('Nested command names detected without "/" separators. Ensure completion graph normalization is correct.')
    }

    if (errors.length > 0) {
      for (const error of errors) {
        console.error(colors.red(`✗ ${error}`))
      }
      throw new Error('Completion metadata validation failed.')
    }

    for (const warning of warnings) {
      console.log(colors.yellow(`! ${warning}`))
    }

    console.log(colors.green(`✓ Loaded ${entries.length} generated command entries from ${generatedPath}`))
    if (strict && warnings.length > 0) {
      throw new Error('Strict mode enabled and warnings were found.')
    }
  }
})
