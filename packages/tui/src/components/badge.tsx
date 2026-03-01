import { useTuiTheme } from './theme.js'
import {
  resolveVariantStyle,
  type ComponentEmphasis,
  type ComponentSize,
  type ComponentTone
} from './variant.js'

export type BadgeTone = Extract<ComponentTone, 'default' | 'accent' | 'success' | 'warning' | 'danger'>

export interface BadgeProps {
  label: string
  tone?: BadgeTone
  size?: ComponentSize
  emphasis?: ComponentEmphasis
  fg?: string
  bg?: string
}

function wrapLabel(label: string, size: ComponentSize): string {
  if (size === 'sm') return `[${label}]`
  if (size === 'lg') return `[[ ${label} ]]`
  return `[ ${label} ]`
}

export function Badge({
  label,
  tone = 'default',
  size = 'md',
  emphasis = 'outline',
  fg,
  bg
}: BadgeProps) {
  const theme = useTuiTheme()
  const style = resolveVariantStyle(theme.tokens, {
    tone,
    size,
    emphasis,
    fg,
    bg
  })

  return <text content={wrapLabel(label, size)} fg={style.fg} bg={style.bg} />
}
