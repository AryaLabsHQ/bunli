import { useTuiTheme } from './theme.js'

export interface DividerProps {
  width?: number
  char?: string
}

export function Divider({ width = 48, char = '─' }: DividerProps) {
  const { tokens } = useTuiTheme()
  return <text content={char.repeat(Math.max(1, width))} fg={tokens.borderMuted} />
}
