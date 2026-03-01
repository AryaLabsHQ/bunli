import type { ReactNode } from 'react'
import { useTuiTheme } from './theme.js'

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  trailing?: ReactNode
}

export function SectionHeader({ title, subtitle, trailing }: SectionHeaderProps) {
  const { tokens } = useTuiTheme()
  return (
    <box style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <box style={{ flexDirection: 'column', gap: 1 }}>
        <text content={title} fg={tokens.textPrimary} />
        {subtitle ? <text content={subtitle} fg={tokens.textMuted} /> : null}
      </box>
      {trailing ? <box>{trailing}</box> : null}
    </box>
  )
}
