import { describe, expect, test } from 'bun:test'
import { darkThemeTokens } from '../src/components/theme.js'
import { resolveVariantStyle } from '../src/components/variant.js'

describe('@bunli/tui variant contracts', () => {
  test('resolves style in order: base -> tone -> emphasis -> size -> override', () => {
    const style = resolveVariantStyle(darkThemeTokens, {
      tone: 'danger',
      emphasis: 'solid',
      size: 'lg',
      fg: '#ffffff',
      border: '#ff0000'
    })

    expect(style.bg).toBe(darkThemeTokens.textDanger)
    expect(style.padding).toBe(2)
    expect(style.fg).toBe('#ffffff')
    expect(style.border).toBe('#ff0000')
  })

  test('outline emphasis keeps background neutral while tone colors border', () => {
    const style = resolveVariantStyle(darkThemeTokens, {
      tone: 'warning',
      emphasis: 'outline'
    })

    expect(style.bg).toBe(darkThemeTokens.background)
    expect(style.border).toBe(darkThemeTokens.textWarning)
    expect(style.fg).toBe(darkThemeTokens.textWarning)
  })

  test('default subtle variant uses muted surfaces', () => {
    const style = resolveVariantStyle(darkThemeTokens, {
      tone: 'default',
      emphasis: 'subtle',
      size: 'sm'
    })

    expect(style.bg).toBe(darkThemeTokens.backgroundMuted)
    expect(style.border).toBe(darkThemeTokens.borderMuted)
    expect(style.padding).toBe(0)
  })
})
