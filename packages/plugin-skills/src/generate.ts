import type { Command, CLIOption } from '@bunli/core'
import { renderManifestFull, toJsonSchema, resolveTypeName } from '@bunli/core'

/**
 * Generates a SKILL.md file with frontmatter and command body.
 */
export function generateSkillFile(
  cliName: string,
  commands: Map<string, Command<any, any>>,
  options: GenerateOptions = {}
): string {
  const { description } = options
  const slug = cliName.replace(/\s+/g, '-')

  const frontmatter = renderFrontmatter({
    name: slug,
    ...(description ? { description } : {})
  })

  // Build body using manifest renderer
  const body = renderManifestFull(cliName, commands, description)

  return `${frontmatter}\n\n${body}\n`
}

/**
 * Generates a compact SKILL.md for a single command.
 */
export function generateCommandSkill(
  cliName: string,
  cmdName: string,
  cmd: Command<any, any>
): string {
  const fullName = `${cliName} ${cmdName}`
  const slug = fullName.replace(/\s+/g, '-')

  const frontmatter = renderFrontmatter({
    name: slug,
    ...(cmd.description ? { description: cmd.description } : {})
  })

  const sections: string[] = [`# ${fullName}`]
  if (cmd.description) sections.push('', cmd.description)

  // Options table
  if (cmd.options && Object.keys(cmd.options).length > 0) {
    const rows: string[] = []
    for (const [key, opt] of Object.entries(cmd.options)) {
      const option = opt as CLIOption<any>
      const jsonSchema = toJsonSchema(option.schema)
      const type = resolveTypeName(jsonSchema)
      const def = jsonSchema.default !== undefined ? String(jsonSchema.default) : ''
      const flag = option.short ? `--${key}, -${option.short}` : `--${key}`
      const desc = option.description ?? ''
      rows.push(`| \`${flag}\` | \`${type}\` | ${def ? `\`${def}\`` : ''} | ${desc} |`)
    }
    sections.push(
      '',
      '## Options',
      '',
      '| Flag | Type | Default | Description |',
      '|------|------|---------|-------------|',
      ...rows
    )
  }

  return `${frontmatter}\n\n${sections.join('\n')}\n`
}

export interface GenerateOptions {
  /** CLI description for the skill frontmatter. */
  description?: string
}

function renderFrontmatter(fields: Record<string, string>): string {
  const lines = ['---']

  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: ${formatFrontmatterValue(key, value)}`)
  }

  lines.push('---')
  return lines.join('\n')
}

function formatFrontmatterValue(key: string, value: string): string {
  if (key === 'name' && /^[a-z0-9][a-z0-9-]*$/.test(value)) {
    return value
  }

  return JSON.stringify(value)
}
