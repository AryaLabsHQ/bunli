import { useTuiTheme, type TuiThemeTokens } from './theme.js'

export type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'

export interface BadgeProps {
  label: string
  tone?: BadgeTone
}

function toneColor(tone: BadgeTone, tokens: TuiThemeTokens): string {
  if (tone === 'accent') return tokens.accent
  if (tone === 'success') return tokens.textSuccess
  if (tone === 'warning') return tokens.textWarning
  if (tone === 'danger') return tokens.textDanger
  return tokens.textMuted
}

export function Badge({ label, tone = 'default' }: BadgeProps) {
  const theme = useTuiTheme()
  const color = toneColor(tone, theme.tokens)
  return <text content={`[${label}]`} fg={color} />
}
