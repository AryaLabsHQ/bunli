import type { ReactNode } from 'react'
import { useTuiTheme } from './theme.js'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: string
  action?: ReactNode
}

export function EmptyState({ title, description, icon = '...', action }: EmptyStateProps) {
  const { tokens } = useTuiTheme()
  return (
    <box border padding={2} style={{ flexDirection: 'column', gap: 1, borderColor: tokens.borderMuted }}>
      <text content={icon} fg={tokens.textMuted} />
      <text content={title} fg={tokens.textPrimary} />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      {action ? <box style={{ marginTop: 1 }}>{action}</box> : null}
    </box>
  )
}
