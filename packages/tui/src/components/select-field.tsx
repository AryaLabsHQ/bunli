import { useCallback, useMemo } from 'react'
import type { SelectOption } from '@opentui/core'
import { useFormField } from './form-context.js'
import { useTuiTheme } from '@bunli/runtime/app'

export interface SelectFieldProps {
  label: string
  name: string
  options: SelectOption[]
  required?: boolean
  description?: string
  defaultValue?: SelectOption['value']
  onChange?: (value: SelectOption['value']) => void
}

export function SelectField({ 
  label, 
  name, 
  options,
  required,
  description,
  defaultValue,
  onChange
}: SelectFieldProps) {
  const { tokens } = useTuiTheme()
  const initialValue = defaultValue ?? options[0]?.value

  const field = useFormField<SelectOption['value']>(name, {
    defaultValue: initialValue,
    submitOnEnter: false
  })

  const selectedIndex = useMemo(() => {
    const index = options.findIndex((option) => option.value === field.value)
    if (index >= 0) return index
    return 0
  }, [field.value, options])

  const handleChange = useCallback((index: number, option: SelectOption | null) => {
    if (!option) return
    field.setValue(option.value)
    field.blur()
    onChange?.(option.value)
  }, [field, onChange])

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text
        content={`${field.focused ? '>' : ' '} ${label}${required ? ' *' : ''}`}
        fg={field.focused ? tokens.accent : tokens.textPrimary}
      />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box
        width='100%'
        border
        height={8}
        style={{
          marginTop: 0.5,
          borderColor: field.error ? tokens.textDanger : field.focused ? tokens.accent : tokens.borderMuted
        }}
      >
        <select
          options={options}
          selectedIndex={selectedIndex}
          onChange={handleChange}
          focused={field.focused}
          style={{
            flexGrow: 1
          }}
        />
      </box>
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
