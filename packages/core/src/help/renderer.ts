/**
 * Help rendering module — extracted from cli.ts for reuse and testability.
 */

import type { Command, CLIOption, HelpRenderContext, HelpRenderer, TerminalInfo } from '../types.js'

/**
 * Context for the built-in help renderer.
 */
export interface HelpContext {
  cliName: string
  version: string
  description?: string
  /** Resolved terminal info for width calculations */
  terminal: TerminalInfo
}

/**
 * Collect top-level commands from a command map (excluding alias duplicates and nested commands).
 */
export function collectTopLevelCommands<TStore = {}>(
  commands: Map<string, Command<any, TStore>>
): Command<any, TStore>[] {
  const topLevel = new Set<Command<any, TStore>>()
  for (const [name, command] of commands) {
    if (!name.includes(' ') && !command.alias?.includes(name)) {
      topLevel.add(command)
    }
  }
  return Array.from(topLevel)
}

/**
 * Render root help (no specific command).
 */
export function renderRootHelp<TStore = {}>(
  ctx: HelpContext,
  commands: Command<any, TStore>[]
): string {
  const lines: string[] = []
  lines.push(`${ctx.cliName} v${ctx.version}`)
  if (ctx.description) {
    lines.push(ctx.description)
  }

  if (commands.length > 0) {
    lines.push('')
    lines.push('Commands:')
    const rows = commands.map((command) => ({
      label: command.name,
      description: command.description || ''
    }))
    lines.push(...formatTwoColumnRows(rows, ctx.terminal.width || 80))
  }

  return lines.join('\n')
}

/**
 * Render help for a specific command.
 */
export function renderCommandHelp<TStore = {}>(
  ctx: HelpContext,
  cmd: Command<any, TStore>,
  path: string[] = []
): string {
  const lines: string[] = []
  const fullPath = [...path, cmd.name].join(' ')
  lines.push(`Usage: ${ctx.cliName} ${fullPath} [options]`)
  lines.push(``)
  lines.push(cmd.description)

  const terminalWidth = ctx.terminal.width || 80

  if (cmd.options && Object.keys(cmd.options).length > 0) {
    lines.push('')
    lines.push('Options:')
    const rows = Object.entries(cmd.options).map(([name, opt]) => {
      const option = opt as CLIOption<any>
      const flag = `--${name}${option.short ? `, -${option.short}` : ''}`
      return { label: flag, description: option.description || '' }
    })
    lines.push(...formatTwoColumnRows(rows, terminalWidth))
  }

  if (cmd.commands && cmd.commands.length > 0) {
    lines.push('')
    lines.push('Subcommands:')
    const rows = cmd.commands.map((subCmd) => ({
      label: subCmd.name,
      description: subCmd.description || ''
    }))
    lines.push(...formatTwoColumnRows(rows, terminalWidth))
  }

  return lines.join('\n')
}

/**
 * Unified help function — dispatches to custom renderer or built-in renderer.
 */
export function showHelp<TStore = {}>(
  ctx: HelpContext,
  commands: Map<string, Command<any, TStore>>,
  customRenderer: HelpRenderer<TStore> | undefined,
  cmd?: Command<any, TStore>,
  path: string[] = []
): void {
  const topLevel = collectTopLevelCommands(commands)

  if (typeof customRenderer === 'function') {
    customRenderer({
      cliName: ctx.cliName,
      version: ctx.version,
      description: ctx.description,
      command: cmd,
      path,
      commands: cmd ? (cmd.commands ?? []) : topLevel,
      terminal: ctx.terminal
    })
    return
  }

  if (!cmd) {
    console.log(renderRootHelp(ctx, topLevel))
  } else {
    console.log(renderCommandHelp(ctx, cmd, path))
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────────────────────────────────────────

export function wrapText(text: string, width: number): string[] {
  const safeWidth = Math.max(10, width)
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const first = words[0]
  if (!first) return ['']
  const lines: string[] = []
  let line = first
  for (let i = 1; i < words.length; i += 1) {
    const word = words[i] ?? ''
    if (!word) continue
    if ((line + ' ' + word).length <= safeWidth) {
      line = `${line} ${word}`
    } else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  return lines
}

export function formatTwoColumnRows(
  rows: Array<{ label: string; description: string }>,
  terminalWidth: number
): string[] {
  const indent = '  '
  const maxLabel = rows.reduce((max, row) => Math.max(max, row.label.length), 0)
  const maxColumn = Math.max(18, Math.floor(terminalWidth * 0.4))
  const labelWidth = Math.min(maxLabel + 2, maxColumn)
  const descWidth = Math.max(20, terminalWidth - indent.length - labelWidth - 1)

  const output: string[] = []

  for (const row of rows) {
    const label = row.label
    const description = row.description || ''
    if (label.length >= labelWidth - 1) {
      output.push(`${indent}${label}`)
      const lines = wrapText(description, descWidth)
      for (const line of lines) {
        output.push(`${indent}${' '.repeat(labelWidth)}${line}`)
      }
      continue
    }
    const paddedLabel = label.padEnd(labelWidth)
    const lines = wrapText(description, descWidth)
    lines.forEach((line, index) => {
      if (index === 0) {
        output.push(`${indent}${paddedLabel}${line}`)
      } else {
        output.push(`${indent}${' '.repeat(labelWidth)}${line}`)
      }
    })
  }

  return output
}
