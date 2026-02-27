import type { ReactNode } from 'react'
import { useTuiTheme } from './theme.js'

export type PanelTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'

export interface PanelProps {
  title?: string
  subtitle?: string
  footer?: ReactNode
  tone?: PanelTone
  padded?: boolean
  children?: ReactNode
}

function panelToneColor(tone: PanelTone, accent: string, success: string, warning: string, danger: string): string {
  if (tone === 'accent') return accent
  if (tone === 'success') return success
  if (tone === 'warning') return warning
  if (tone === 'danger') return danger
  return accent
}

export function Panel({ title, subtitle, footer, tone = 'default', padded = true, children }: PanelProps) {
  const { tokens } = useTuiTheme()
  const borderColor = panelToneColor(
    tone,
    tokens.accent,
    tokens.textSuccess,
    tokens.textWarning,
    tokens.textDanger
  )

  return (
    <box
      border
      padding={padded ? 1 : undefined}
      style={{
        flexDirection: 'column',
        gap: 1,
        backgroundColor: tokens.backgroundMuted,
        borderColor
      }}
    >
      {title ? <text content={title} fg={tokens.textPrimary} /> : null}
      {subtitle ? <text content={subtitle} fg={tokens.textMuted} /> : null}
      <box style={{ flexDirection: 'column', gap: 1 }}>{children}</box>
      {footer ? <box style={{ marginTop: 1 }}>{footer}</box> : null}
    </box>
  )
}
