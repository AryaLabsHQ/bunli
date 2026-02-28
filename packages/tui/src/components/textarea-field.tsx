import { useCallback, useRef } from 'react'
import type { TextareaRenderable } from '@opentui/core'
import { useFormField } from './form-context.js'
import { useTuiTheme } from './theme.js'

export interface TextareaFieldProps {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  description?: string
  defaultValue?: string
}

export function TextareaField({
  label,
  name,
  placeholder,
  required,
  description,
  defaultValue = ''
}: TextareaFieldProps) {
  const { tokens } = useTuiTheme()
  const field = useFormField<string>(name, {
    defaultValue,
    submitOnEnter: false
  })
  const ref = useRef<TextareaRenderable | null>(null)

  const syncFromBuffer = useCallback(() => {
    const value = ref.current?.plainText ?? ''
    field.setValue(value)
  }, [field])

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} fg={tokens.textPrimary} />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box border height={7} style={{ borderColor: field.error ? tokens.textDanger : tokens.borderMuted }}>
        <textarea
          ref={ref}
          initialValue={field.value ?? defaultValue}
          placeholder={placeholder}
          focused={field.focused}
          onContentChange={syncFromBuffer}
          onSubmit={() => {
            syncFromBuffer()
            field.blur()
          }}
          style={{
            focusedBackgroundColor: tokens.backgroundMuted
          }}
        />
      </box>
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
