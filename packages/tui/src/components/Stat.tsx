import { useTuiTheme, type TuiThemeTokens } from './theme.js'

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'accent'

export interface StatProps {
  label: string
  value: string | number
  hint?: string
  tone?: StatTone
}

function valueColor(tone: StatTone, tokens: TuiThemeTokens): string {
  if (tone === 'success') return tokens.textSuccess
  if (tone === 'warning') return tokens.textWarning
  if (tone === 'danger') return tokens.textDanger
  if (tone === 'accent') return tokens.accent
  return tokens.textPrimary
}

export function Stat({ label, value, hint, tone = 'default' }: StatProps) {
  const { tokens } = useTuiTheme()
  return (
    <box border padding={1} style={{ flexDirection: 'column', gap: 1, borderColor: tokens.border }}>
      <text content={label} fg={tokens.textMuted} />
      <text content={String(value)} fg={valueColor(tone, tokens)} />
      {hint ? <text content={hint} fg={tokens.textMuted} /> : null}
    </box>
  )
}
