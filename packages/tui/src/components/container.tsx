import type { ReactNode } from 'react'
import { useTuiTheme } from './theme.js'

export interface ContainerProps {
  children: ReactNode
  title?: string
  border?: boolean
  padding?: number
  muted?: boolean
  style?: Record<string, unknown>
}

export function Container({
  children,
  title,
  border = false,
  padding = 1,
  muted = false,
  style = {}
}: ContainerProps) {
  const { tokens } = useTuiTheme()
  return (
    <box
      title={title}
      border={border}
      padding={padding}
      style={{
        flexDirection: 'column',
        gap: 1,
        backgroundColor: muted ? tokens.backgroundMuted : tokens.background,
        borderColor: tokens.border,
        ...style
      }}
    >
      {children}
    </box>
  )
}
