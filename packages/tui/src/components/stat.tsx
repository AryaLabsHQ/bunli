import { useTuiTheme } from './theme.js'
import {
  resolveVariantStyle,
  type ComponentEmphasis,
  type ComponentSize,
  type ComponentTone
} from './variant.js'

export type StatTone = Extract<ComponentTone, 'default' | 'success' | 'warning' | 'danger' | 'accent'>

export interface StatProps {
  label: string
  value: string | number
  hint?: string
  tone?: StatTone
  size?: ComponentSize
  emphasis?: ComponentEmphasis
  formatValue?: (value: string | number) => string
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  size = 'md',
  emphasis = 'outline',
  formatValue
}: StatProps) {
  const { tokens } = useTuiTheme()
  const style = resolveVariantStyle(tokens, {
    tone,
    size,
    emphasis
  })

  return (
    <box border padding={style.padding} style={{ flexDirection: 'column', gap: 1, borderColor: style.border, backgroundColor: style.bg }}>
      <text content={label} fg={tokens.textMuted} />
      <text content={formatValue ? formatValue(value) : String(value)} fg={style.fg} />
      {hint ? <text content={hint} fg={tokens.textMuted} /> : null}
    </box>
  )
}
