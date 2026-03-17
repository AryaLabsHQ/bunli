import { createCLI, defineCommand, option } from '@bunli/core'
import { completionsPlugin } from '@bunli/plugin-completions'
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

interface CompletionProbeResult {
  directive: string
  suggestions: number
  candidates: string[]
}

function normalizeCommandPath(name: string): string {
  return name
    .replace(/\s+/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .trim()
}

function resolveChildPath(parentPath: string, rawName: string): string {
  const normalizedChild = normalizeCommandPath(rawName)
  if (!normalizedChild) return ''
  if (!parentPath) return normalizedChild

  if (!normalizedChild.includes('/')) {
    return `${parentPath}/${normalizedChild}`
  }

  if (normalizedChild === parentPath || normalizedChild.startsWith(`${parentPath}/`)) {
    return normalizedChild
  }

  return normalizedChild
}

function toCandidateLabel(line: string): string {
  return line.split('\t', 1)[0]?.trim() ?? ''
}

function collectNestedExpectedChildren(
  entries: Array<{ name: string, metadata?: { name?: string, commands?: Array<unknown> } }>
): { expectedByParent: Map<string, Set<string>>, warnings: string[] } {
  const expectedByParent = new Map<string, Set<string>>()
  const warnings: string[] = []

  const addExpectedChild = (parentPath: string, childSegment: string) => {
    const existing = expectedByParent.get(parentPath)
    if (existing) {
      existing.add(childSegment)
      return
    }
    expectedByParent.set(parentPath, new Set([childSegment]))
  }

  const walkChildren = (parentPath: string, commands: Array<unknown>) => {
    for (const rawChild of commands) {
      if (!rawChild || typeof rawChild !== 'object') continue

      const child = rawChild as {
        name?: unknown
        commands?: unknown
      }

      const childName = typeof child.name === 'string' ? child.name.trim() : ''
      if (!childName) {
        warnings.push(`Nested command under "${parentPath}" is missing a name.`)
        continue
      }

      const childPath = resolveChildPath(parentPath, childName)
      if (!childPath) continue

      if (!childPath.startsWith(`${parentPath}/`)) {
        warnings.push(
          `Nested child "${childName}" under "${parentPath}" does not resolve beneath its parent path.`
        )
      } else {
        const relative = childPath.slice(parentPath.length + 1)
        const segment = relative.split('/')[0]?.trim()
        if (segment) addExpectedChild(parentPath, segment)
      }

      if (Array.isArray(child.commands) && child.commands.length > 0) {
        walkChildren(childPath, child.commands)
      }
    }
  }

  for (const entry of entries) {
    const runtimeName = typeof entry.name === 'string' ? entry.name.trim() : ''
    const metadataName = typeof entry.metadata?.name === 'string' ? entry.metadata.name.trim() : ''
    const effectiveName = metadataName || runtimeName
    const rootPath = normalizeCommandPath(effectiveName)

    if (!rootPath || !Array.isArray(entry.metadata?.commands) || entry.metadata.commands.length === 0) {
      continue
    }

    walkChildren(rootPath, entry.metadata.commands)
  }

  return { expectedByParent, warnings }
}

async function runCompletionProtocolProbe(
  generatedPath: string,
  protocolArgs: string[] = ['']
): Promise<CompletionProbeResult> {
  const stdout: string[] = []
  const stderr: string[] = []

  const originalLog = console.log
  const originalError = console.error

  console.log = (...args: unknown[]) => stdout.push(args.map(String).join(' '))
  console.error = (...args: unknown[]) => stderr.push(args.map(String).join(' '))

  try {
    const probeCli = await createCLI({
      name: 'bunli-doctor-probe',
      version: '0.0.0',
      plugins: [
        completionsPlugin({
          generatedPath,
          commandName: 'bunli-doctor-probe',
          executable: 'bunli-doctor-probe'
        })
      ] as const
    })

    await probeCli.run(['complete', '--', ...protocolArgs])
  } finally {
    console.log = originalLog
    console.error = originalError
  }

  if (stderr.length > 0) {
    throw new Error(`Completion protocol probe wrote to stderr:\n${stderr.join('\n')}`)
  }

  const lines = stdout
    .join('\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const directive = lines.at(-1) ?? ''
  const suggestionLines = lines.length > 0 ? lines.slice(0, -1) : []
  const suggestions = suggestionLines.length
  const candidates = suggestionLines.map(toCandidateLabel).filter(Boolean)

  return { directive, suggestions, candidates }
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

    if (errors.length === 0) {
      let probeResult: CompletionProbeResult | null = null
      try {
        probeResult = await runCompletionProtocolProbe(generatedPath)
      } catch (cause) {
        errors.push(
          `Completion protocol round-trip failed for "complete -- ''": ${cause instanceof Error ? cause.message : String(cause)}`
        )
      }

      if (probeResult) {
        if (!/^:\d+$/.test(probeResult.directive)) {
          errors.push(
            `Completion protocol round-trip did not end with a directive line. Received: "${probeResult.directive || '<empty>'}"`
          )
        } else {
          console.log(colors.green('✓ Completion protocol round-trip passed (complete -- \'\')'))
        }

        if (entries.length > 0 && probeResult.suggestions === 0) {
          warnings.push('Completion protocol round-trip returned no suggestions for empty input.')
        }

        const nestedExpectations = collectNestedExpectedChildren(entries)
        warnings.push(...nestedExpectations.warnings)

        for (const [parentPath, expectedChildren] of nestedExpectations.expectedByParent) {
          const probeArgs = [...parentPath.split('/').filter(Boolean), '']
          try {
            const nestedProbe = await runCompletionProtocolProbe(generatedPath, probeArgs)

            if (!/^:\d+$/.test(nestedProbe.directive)) {
              errors.push(
                `Nested completion probe did not end with directive line for "${parentPath}". Received: "${nestedProbe.directive || '<empty>'}"`
              )
              continue
            }

            const missingChildren = Array.from(expectedChildren)
              .filter((child) => !nestedProbe.candidates.includes(child))
              .sort()
            if (missingChildren.length > 0) {
              warnings.push(
                `Nested completion probe for "${parentPath}" is missing children: ${missingChildren.join(', ')}`
              )
            }
          } catch (cause) {
            errors.push(
              `Nested completion probe failed for "${parentPath}": ${cause instanceof Error ? cause.message : String(cause)}`
            )
          }
        }
      }
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
