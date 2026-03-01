import { useCallback, useEffect, useState } from 'react'
import { useFormField } from './form-context.js'
import { useTuiTheme } from './theme.js'

export interface NumberFieldProps {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  description?: string
  defaultValue?: number
  onChange?: (value: number | undefined) => void
}

export function NumberField({
  label,
  name,
  placeholder,
  required,
  description,
  defaultValue,
  onChange
}: NumberFieldProps) {
  const { tokens } = useTuiTheme()
  const field = useFormField<number | undefined>(name, {
    defaultValue,
    submitOnEnter: true
  })
  const [draft, setDraft] = useState(() =>
    typeof field.value === 'number' && Number.isFinite(field.value) ? String(field.value) : ''
  )

  useEffect(() => {
    if (typeof field.value === 'number' && Number.isFinite(field.value)) {
      setDraft(String(field.value))
      return
    }
    setDraft('')
  }, [field.value])

  const handleInput = useCallback(
    (value: string) => {
      setDraft(value)
      const trimmed = value.trim()
      if (!trimmed) {
        field.setValue(undefined)
        onChange?.(undefined)
        return
      }

      const parsed = Number(trimmed)
      if (!Number.isNaN(parsed)) {
        field.setValue(parsed)
        onChange?.(parsed)
      }
    },
    [field, onChange]
  )

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} fg={tokens.textPrimary} />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box border height={3} style={{ borderColor: field.error ? tokens.textDanger : tokens.borderMuted }}>
        <input
          value={draft}
          placeholder={placeholder}
          onInput={handleInput}
          focused={field.focused}
          style={{ focusedBackgroundColor: tokens.backgroundMuted }}
        />
      </box>
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
