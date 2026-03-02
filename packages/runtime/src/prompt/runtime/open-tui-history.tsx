/** @jsxImportSource @opentui/react */
import type { ReactNode } from 'react'
import { ThemeProvider } from '../../components/theme.js'

export function colorizeAnsi(text: string, code: number): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return text
  return `\x1b[${code}m${text}\x1b[0m`
}

export function formatHistoryLineForStdout(line: string): string {
  if (line.length === 0) return line
  if (line.startsWith('● ')) return colorizeAnsi(line, 96)
  if (line.startsWith('◇ ')) return colorizeAnsi(line, 36)
  if (line.startsWith('┌ ') || line.startsWith('└ ')) return colorizeAnsi(line, 36)
  if (line.startsWith('OK ')) return colorizeAnsi(line, 32)
  if (line.startsWith('WARN ')) return colorizeAnsi(line, 33)
  if (line.startsWith('ERR ')) return colorizeAnsi(line, 31)
  if (line.startsWith('INFO ')) return colorizeAnsi(line, 36)
  if (line.startsWith('│ ')) {
    return `${colorizeAnsi('│', 90)} ${line.slice(2)}`
  }
  if (line.startsWith('? ')) {
    return `${colorizeAnsi('?', 36)} ${line.slice(2)}`
  }
  return line
}

export function historyLineColor(line: string): string {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('? ')) return '#f4f7fb'
  if (trimmed.startsWith('OK ')) return '#38d49c'
  if (trimmed.startsWith('WARN ')) return '#f9c85b'
  if (trimmed.startsWith('ERR ')) return '#ff6b6b'
  if (trimmed.startsWith('INFO ')) return '#6ac4ff'
  if (trimmed.startsWith('● ')) return '#6ac4ff'
  if (trimmed.startsWith('◇ ')) return '#6ac4ff'
  if (trimmed.startsWith('┌ ') || trimmed.startsWith('└ ')) return '#6ac4ff'
  if (trimmed.startsWith('│ ')) return '#8fa1b5'
  return '#8fa1b5'
}

interface OpenTuiPromptShellProps {
  children: ReactNode
}

export function OpenTuiPromptShell({ children }: OpenTuiPromptShellProps) {
  return (
    <ThemeProvider theme='dark'>
      <box style={{ flexDirection: 'column', gap: 0 }}>
        {children}
      </box>
    </ThemeProvider>
  )
}
