import { useCallback } from 'react'
import { useFormField } from './form-context.js'

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
      <text content={`${label}${required ? ' *' : ''}`} />
      {description ? <text content={description} fg="#8892b0" /> : null}
      <box title={label} border height={3} style={{ marginTop: 0.5 }}>
        <input
          value={field.value ?? ''}
          placeholder={placeholder}
          onInput={handleInput}
          onSubmit={handleSubmit}
          focused={field.focused}
          style={{ focusedBackgroundColor: '#000000' }}
        />
      </box>
      {field.error ? <text content={field.error} fg="#ff6b6b" /> : null}
    </box>
  )
}
