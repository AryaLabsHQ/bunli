import { useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'

export interface FormProps {
  title: string
  onSubmit: (values: Record<string, any>) => void
  onCancel?: () => void
  children: React.ReactNode
}

export function Form({ title, onSubmit, onCancel, children }: FormProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  
  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormValues(prev => ({ ...prev, [name]: value }))
  }, [])
  
  useKeyboard((key) => {
    if (key.name === 'escape' && onCancel) {
      onCancel()
    }
    if (key.name === 'enter') {
      onSubmit(formValues)
    }
  })
  
  return (
    <box title={title} border padding={2} style={{ flexDirection: 'column' }}>
      {children}
      <box style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
        <text content="Press Enter to submit, Esc to cancel" />
      </box>
    </box>
  )
}
