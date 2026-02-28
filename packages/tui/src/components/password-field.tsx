import { useCallback, useMemo, useState } from 'react'
import { useFormContext, useFormField } from './form-context.js'
import { useScopedKeyboard } from './focus-scope.js'
import { useTuiTheme } from './theme.js'

export interface PasswordFieldProps {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  description?: string
  defaultValue?: string
  onChange?: (value: string) => void
}

function mask(value: string): string {
  return '*'.repeat(value.length)
}

function resolveTextInput(sequence: string): string {
  const normalized = sequence
    .replace(/\u001b\[200~/g, '')
    .replace(/\u001b\[201~/g, '')
    .replace(/\r\n/g, '')
    .replace(/[\r\n]/g, '')

  let output = ''
  for (const char of normalized) {
    const codePoint = char.codePointAt(0)
    if (typeof codePoint !== 'number') continue
    if (codePoint < 0x20 || codePoint === 0x7f) continue
    output += char
  }
  return output
}

export function PasswordField({
  label,
  name,
  placeholder,
  required,
  description,
  defaultValue = '',
  onChange
}: PasswordFieldProps) {
  const { tokens } = useTuiTheme()
  const { keyboardScopeId } = useFormContext()
  const field = useFormField<string>(name, {
    defaultValue,
    submitOnEnter: true
  })
  const [revealed, setRevealed] = useState(false)

  const handleInput = useCallback((value: string) => {
    field.setValue(value)
    onChange?.(value)
  }, [field, onChange])

  const value = field.value ?? ''
  const visibleValue = revealed ? value : mask(value)
  const display = useMemo(() => {
    const base =
      value.length > 0
        ? visibleValue
        : (placeholder ?? '')
    if (field.focused) return `${base}▌`
    return base
  }, [field.focused, placeholder, value.length, visibleValue])

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (!field.focused) return false

      if (key.ctrl && key.name === 'r') {
        setRevealed((prev) => !prev)
        return true
      }

      if (key.name === 'backspace' || key.name === 'delete') {
        if (value.length === 0) return true
        handleInput(value.slice(0, -1))
        return true
      }

      if (key.ctrl || key.meta || key.option) {
        return false
      }

      const typed = resolveTextInput(key.sequence ?? '')
      if (typed.length > 0) {
        handleInput(`${value}${typed}`)
        return true
      }

      return false
    },
    { active: field.focused, priority: 10 }
  )

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} fg={tokens.textPrimary} />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box border height={3} style={{ borderColor: field.error ? tokens.textDanger : tokens.borderMuted }}>
        <box style={{ backgroundColor: field.focused ? tokens.backgroundMuted : tokens.background }}>
          <text
            content={display}
            fg={value.length === 0 ? tokens.textMuted : tokens.textPrimary}
          />
        </box>
      </box>
      <text content={`Value: ${mask(value)} ${revealed ? '(revealed)' : '(hidden, Ctrl+R reveal)'}`} fg={tokens.textMuted} />
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
