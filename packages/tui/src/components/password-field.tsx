import { useCallback } from 'react'
import { useFormField } from './form-context.js'
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
  const field = useFormField<string>(name, {
    defaultValue,
    submitOnEnter: true
  })

  const handleInput = useCallback((value: string) => {
    field.setValue(value)
    onChange?.(value)
  }, [field, onChange])

  const value = field.value ?? ''

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} fg={tokens.textPrimary} />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box border height={3} style={{ borderColor: field.error ? tokens.textDanger : tokens.borderMuted }}>
        <input
          value={value}
          placeholder={placeholder}
          onInput={handleInput}
          focused={field.focused}
          style={{ focusedBackgroundColor: tokens.backgroundMuted }}
        />
      </box>
      <text content={`Value: ${mask(value)}`} fg={tokens.textMuted} />
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
