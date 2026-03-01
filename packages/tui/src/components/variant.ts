import type { TuiThemeTokens } from './theme.js'

export type ComponentTone = 'default' | 'info' | 'accent' | 'success' | 'warning' | 'danger'
export type ComponentSize = 'sm' | 'md' | 'lg'
export type ComponentEmphasis = 'subtle' | 'outline' | 'solid'

export interface VariantResolutionInput {
  tone?: ComponentTone
  size?: ComponentSize
  emphasis?: ComponentEmphasis
  fg?: string
  bg?: string
  border?: string
  padding?: number
}

export interface VariantStyle {
  fg: string
  bg: string
  border: string
  padding: number
  toneColor: string
}

function toneColor(tokens: TuiThemeTokens, tone: ComponentTone): string {
  if (tone === 'accent' || tone === 'info') return tokens.accent
  if (tone === 'success') return tokens.textSuccess
  if (tone === 'warning') return tokens.textWarning
  if (tone === 'danger') return tokens.textDanger
  return tokens.border
}

function sizePadding(size: ComponentSize): number {
  if (size === 'sm') return 0
  if (size === 'lg') return 2
  return 1
}

/**
 * Resolve style as: base -> tone -> emphasis -> size -> explicit overrides.
 */
export function resolveVariantStyle(tokens: TuiThemeTokens, input: VariantResolutionInput = {}): VariantStyle {
  const tone = input.tone ?? 'default'
  const emphasis = input.emphasis ?? 'subtle'
  const size = input.size ?? 'md'

  const resolvedTone = toneColor(tokens, tone)

  const base: VariantStyle = {
    fg: tokens.textPrimary,
    bg: tokens.backgroundMuted,
    border: tokens.borderMuted,
    padding: sizePadding(size),
    toneColor: resolvedTone
  }

  const withTone: VariantStyle = {
    ...base,
    border: tone === 'default' ? base.border : resolvedTone,
    fg: tone === 'default' ? base.fg : resolvedTone
  }

  const withEmphasis: VariantStyle = (() => {
    if (emphasis === 'solid') {
      return {
        ...withTone,
        fg: tokens.background,
        bg: resolvedTone,
        border: resolvedTone
      }
    }

    if (emphasis === 'outline') {
      return {
        ...withTone,
        fg: tone === 'default' ? tokens.textPrimary : resolvedTone,
        bg: tokens.background,
        border: tone === 'default' ? tokens.border : resolvedTone
      }
    }

    return withTone
  })()

  return {
    ...withEmphasis,
    padding: input.padding ?? withEmphasis.padding,
    fg: input.fg ?? withEmphasis.fg,
    bg: input.bg ?? withEmphasis.bg,
    border: input.border ?? withEmphasis.border
  }
}

export function toneToPrefix(tone: ComponentTone): string {
  if (tone === 'success') return 'OK'
  if (tone === 'warning') return 'WARN'
  if (tone === 'danger') return 'ERR'
  return 'INFO'
}
