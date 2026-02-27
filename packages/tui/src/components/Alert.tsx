import type { ReactNode } from 'react'
import { useTuiTheme, type TuiThemeTokens } from './theme.js'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps {
  tone?: AlertTone
  title?: string
  message: string
  children?: ReactNode
}

function toneColor(tone: AlertTone, tokens: TuiThemeTokens): string {
  if (tone === 'success') return tokens.textSuccess
  if (tone === 'warning') return tokens.textWarning
  if (tone === 'danger') return tokens.textDanger
  return tokens.accent
}

function tonePrefix(tone: AlertTone): string {
  if (tone === 'success') return 'OK'
  if (tone === 'warning') return 'WARN'
  if (tone === 'danger') return 'ERR'
  return 'INFO'
}

export function Alert({ tone = 'info', title, message, children }: AlertProps) {
  const theme = useTuiTheme()
  const color = toneColor(tone, theme.tokens)
  const prefix = tonePrefix(tone)

  return (
    <box
      border
      padding={1}
      style={{
        flexDirection: 'column',
        gap: 1,
        borderColor: color,
        backgroundColor: theme.tokens.backgroundMuted
      }}
    >
      <text content={`${prefix}${title ? `: ${title}` : ''}`} fg={color} />
      <text content={message} fg={theme.tokens.textPrimary} />
      {children ? <box style={{ marginTop: 1 }}>{children}</box> : null}
    </box>
  )
}
