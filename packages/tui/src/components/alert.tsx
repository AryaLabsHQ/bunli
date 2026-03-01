import type { ReactNode } from 'react'
import { useTuiTheme } from './theme.js'
import {
  resolveVariantStyle,
  toneToPrefix,
  type ComponentEmphasis,
  type ComponentSize,
  type ComponentTone
} from './variant.js'

export type AlertTone = Extract<ComponentTone, 'info' | 'success' | 'warning' | 'danger'>

export interface AlertProps {
  tone?: AlertTone
  size?: ComponentSize
  emphasis?: ComponentEmphasis
  title?: string
  message: string
  children?: ReactNode
  fg?: string
  bg?: string
  borderColor?: string
  padding?: number
}

export function Alert({
  tone = 'info',
  size = 'md',
  emphasis = 'subtle',
  title,
  message,
  children,
  fg,
  bg,
  borderColor,
  padding
}: AlertProps) {
  const theme = useTuiTheme()
  const style = resolveVariantStyle(theme.tokens, {
    tone,
    size,
    emphasis,
    fg,
    bg,
    border: borderColor,
    padding
  })

  const prefix = toneToPrefix(tone)

  return (
    <box
      border
      padding={style.padding}
      style={{
        flexDirection: 'column',
        gap: 1,
        borderColor: style.border,
        backgroundColor: style.bg
      }}
    >
      <text content={`${prefix}${title ? `: ${title}` : ''}`} fg={style.fg} />
      <text content={message} fg={theme.tokens.textPrimary} />
      {children ? <box style={{ marginTop: 1 }}>{children}</box> : null}
    </box>
  )
}
