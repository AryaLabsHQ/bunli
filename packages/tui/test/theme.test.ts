import { describe, expect, test } from 'bun:test'
import {
  createTheme,
  darkThemeTokens,
  lightThemeTokens
} from '../src/components/theme.js'

describe('@bunli/tui theme tokens', () => {
  test('createTheme uses dark preset by default', () => {
    const theme = createTheme()
    expect(theme.name).toBe('dark')
    expect(theme.tokens).toEqual(darkThemeTokens)
  })

  test('createTheme supports light preset', () => {
    const theme = createTheme('light')
    expect(theme.name).toBe('light')
    expect(theme.tokens).toEqual(lightThemeTokens)
  })

  test('createTheme merges token overrides on preset', () => {
    const theme = createTheme({
      preset: 'dark',
      tokens: {
        accent: '#ff00aa',
        textMuted: '#888888'
      }
    })

    expect(theme.name).toBe('custom')
    expect(theme.tokens.accent).toBe('#ff00aa')
    expect(theme.tokens.textMuted).toBe('#888888')
    expect(theme.tokens.textPrimary).toBe(darkThemeTokens.textPrimary)
  })

  test('createTheme accepts direct token partials', () => {
    const theme = createTheme({
      border: '#111111',
      textSuccess: '#00aa00'
    })

    expect(theme.name).toBe('custom')
    expect(theme.tokens.border).toBe('#111111')
    expect(theme.tokens.textSuccess).toBe('#00aa00')
    expect(theme.tokens.background).toBe(darkThemeTokens.background)
  })
})
