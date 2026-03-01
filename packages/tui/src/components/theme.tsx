import { createContext, useContext, useMemo, type ReactNode } from 'react'

export interface TuiThemeTokens {
  background: string
  backgroundMuted: string
  border: string
  borderMuted: string
  textPrimary: string
  textMuted: string
  textSuccess: string
  textWarning: string
  textDanger: string
  accent: string
}

export interface TuiTheme {
  name: 'light' | 'dark' | 'custom'
  tokens: TuiThemeTokens
}

type ThemePreset = 'light' | 'dark' | 'auto'

export const darkThemeTokens: TuiThemeTokens = {
  background: '#101418',
  backgroundMuted: '#1b2330',
  border: '#2f3b4a',
  borderMuted: '#223041',
  textPrimary: '#f4f7fb',
  textMuted: '#8fa1b5',
  textSuccess: '#38d49c',
  textWarning: '#f9c85b',
  textDanger: '#ff6b6b',
  accent: '#6ac4ff'
}

export const lightThemeTokens: TuiThemeTokens = {
  background: '#f4f7fb',
  backgroundMuted: '#e6edf5',
  border: '#a8b6c6',
  borderMuted: '#c3cfdb',
  textPrimary: '#102030',
  textMuted: '#4a6179',
  textSuccess: '#0f9960',
  textWarning: '#b67500',
  textDanger: '#c93030',
  accent: '#0f6ad9'
}

export type TuiThemeInput =
  | 'auto'
  | 'light'
  | 'dark'
  | Partial<TuiThemeTokens>
  | {
      preset?: ThemePreset
      tokens?: Partial<TuiThemeTokens>
    }

function parseThemeOverride(value?: string): 'light' | 'dark' | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'light' || normalized === 'dark') return normalized
  return undefined
}

function parseColorFGBG(value?: string): 'light' | 'dark' | undefined {
  if (!value) return undefined
  const segments = value.split(';')
  const background = Number.parseInt(segments[segments.length - 1] ?? '', 10)
  if (!Number.isFinite(background)) return undefined
  if (background >= 0 && background <= 6) return 'dark'
  if (background >= 7 && background <= 15) return 'light'
  return undefined
}

function resolveAutoPreset(): 'light' | 'dark' {
  const env = typeof process !== 'undefined' ? process.env : undefined
  const explicit = parseThemeOverride(env?.BUNLI_TUI_THEME)
    ?? parseThemeOverride(env?.TERM_THEME)
    ?? parseThemeOverride(env?.THEME)
  if (explicit) return explicit
  return parseColorFGBG(env?.COLORFGBG) ?? 'dark'
}

export function createTheme(input: TuiThemeInput = 'dark'): TuiTheme {
  if (input === 'auto') {
    const preset = resolveAutoPreset()
    const base = preset === 'light' ? lightThemeTokens : darkThemeTokens
    return { name: preset, tokens: { ...base } }
  }
  if (input === 'light') {
    return { name: 'light', tokens: { ...lightThemeTokens } }
  }
  if (input === 'dark') {
    return { name: 'dark', tokens: { ...darkThemeTokens } }
  }
  if ('preset' in input || 'tokens' in input) {
    const preset = input.preset === 'auto' ? resolveAutoPreset() : (input.preset ?? 'dark')
    const base = preset === 'light' ? lightThemeTokens : darkThemeTokens
    return {
      name: input.tokens ? 'custom' : preset,
      tokens: { ...base, ...(input.tokens ?? {}) }
    }
  }
  return {
    name: 'custom',
    tokens: { ...darkThemeTokens, ...input }
  }
}

const ThemeContext = createContext<TuiTheme>(createTheme('dark'))

export interface ThemeProviderProps {
  theme?: TuiThemeInput
  children: ReactNode
}

export function ThemeProvider({ theme = 'dark', children }: ThemeProviderProps) {
  const resolvedTheme = useMemo(() => createTheme(theme), [theme])
  return <ThemeContext.Provider value={resolvedTheme}>{children}</ThemeContext.Provider>
}

export function useTuiTheme() {
  return useContext(ThemeContext)
}
