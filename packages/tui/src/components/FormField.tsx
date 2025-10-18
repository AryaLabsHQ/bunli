import { useState } from 'react'

export interface FormFieldProps {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
}

export function FormField({ 
  label, 
  name, 
  placeholder, 
  required,
  value: initialValue = '',
  onChange,
  onSubmit
}: FormFieldProps) {
  const [value, setValue] = useState(initialValue)
  
  const handleInput = (newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
  }
  
  const handleSubmit = (submittedValue: string) => {
    onSubmit?.(submittedValue)
  }
  
  return (
    <box style={{ flexDirection: 'column', marginBottom: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} />
      <box title={label} border height={3} style={{ marginTop: 0.5 }}>
        <input
          placeholder={placeholder}
          onInput={handleInput}
          onSubmit={handleSubmit}
          focused={true}
          style={{ focusedBackgroundColor: "#000000" }}
        />
      </box>
    </box>
  )
}
