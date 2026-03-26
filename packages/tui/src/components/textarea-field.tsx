import { useCallback, useEffect, useRef, useState } from 'react'
import type { TextareaRenderable } from '@opentui/core'
import { useFormField } from './form-context.js'
import { useTuiTheme } from '@bunli/runtime/app'

export interface TextareaFieldProps {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  description?: string
  defaultValue?: string
  showLineNumbers?: boolean
  maxLines?: number
  charLimit?: number
  showCharCount?: boolean
  height?: number
}

export function TextareaField({
  label,
  name,
  placeholder,
  required,
  description,
  defaultValue = '',
  showLineNumbers = false,
  maxLines,
  charLimit,
  showCharCount = false,
  height
}: TextareaFieldProps) {
  const { tokens } = useTuiTheme()
  const field = useFormField<string>(name, {
    defaultValue,
    submitOnEnter: false
  })
  const ref = useRef<TextareaRenderable | null>(null)
  const [charCount, setCharCount] = useState(defaultValue.length)
  const [lineCount, setLineCount] = useState(1)

  const syncFromBuffer = useCallback(() => {
    let value = ref.current?.plainText ?? ''

    if (maxLines) {
      const lines = value.split('\n')
      if (lines.length > maxLines) {
        value = lines.slice(0, maxLines).join('\n')
        ref.current?.setText(value)
      }
    }

    if (charLimit && value.length > charLimit) {
      value = value.slice(0, charLimit)
      ref.current?.setText(value)
    }

    field.setValue(value)
    setCharCount(value.length)
    setLineCount(value.split('\n').length)
  }, [field, maxLines, charLimit])

  useEffect(() => {
    const nextValue = field.value ?? ''
    const currentValue = ref.current?.plainText ?? ''
    if (currentValue !== nextValue) {
      ref.current?.setText(nextValue)
    }
  }, [field.value])

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} fg={tokens.textPrimary} />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box border height={height ?? 7} style={{ borderColor: field.error ? tokens.textDanger : tokens.borderMuted }}>
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
      {(showLineNumbers || showCharCount) && (
        <box style={{ flexDirection: 'row', gap: 2 }}>
          {showLineNumbers && (
            <text content={`Lines: ${lineCount}${maxLines ? `/${maxLines}` : ''}`} fg={tokens.textMuted} />
          )}
          {showCharCount && (
            <text
              content={charLimit ? `${charCount}/${charLimit}` : `${charCount} chars`}
              fg={charLimit && charCount >= charLimit ? tokens.textWarning : tokens.textMuted}
            />
          )}
        </box>
      )}
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
