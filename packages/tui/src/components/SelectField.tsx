import { useState } from 'react'
import type { SelectOption } from '@opentui/core'

export interface SelectFieldProps {
  label: string
  name: string
  options: SelectOption[]
  required?: boolean
  onChange?: (value: string) => void
}

export function SelectField({ 
  label, 
  name, 
  options,
  required,
  onChange
}: SelectFieldProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const handleChange = (index: number, option: SelectOption | null) => {
    setSelectedIndex(index)
    if (option) {
      onChange?.(option.value)
    }
  }
  
  return (
    <box style={{ flexDirection: 'column', marginBottom: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} />
      <box border height={8} style={{ marginTop: 0.5 }}>
        <select
          options={options}
          onChange={handleChange}
          focused={true}
        />
      </box>
    </box>
  )
}
