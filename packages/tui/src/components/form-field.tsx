import { useCallback } from 'react'
import { useFormField } from './form-context.js'
import { useTuiTheme } from './theme.js'

export interface FormFieldProps {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  description?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
}

export function FormField({ 
  label, 
  name, 
  placeholder, 
  required,
  description,
  defaultValue = '',
  onChange,
  onSubmit
}: FormFieldProps) {
  const { tokens } = useTuiTheme()
  const field = useFormField<string>(name, {
    defaultValue,
    submitOnEnter: true
  })

  const handleInput = useCallback((newValue: string) => {
    field.setValue(newValue)
    onChange?.(newValue)
  }, [field, onChange])

  const handleSubmit = useCallback((submittedValue: string) => {
    field.setValue(submittedValue)
    field.blur()
    onSubmit?.(submittedValue)
  }, [field, onSubmit])

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} fg={tokens.textPrimary} />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box
        title={label}
        border
        height={3}
        style={{ marginTop: 0.5, borderColor: field.error ? tokens.textDanger : tokens.borderMuted }}
      >
        <input
          value={field.value ?? ''}
          placeholder={placeholder}
          onInput={handleInput}
          onSubmit={handleSubmit}
          focused={field.focused}
          style={{
            focusedBackgroundColor: tokens.backgroundMuted
          }}
        />
      </box>
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
