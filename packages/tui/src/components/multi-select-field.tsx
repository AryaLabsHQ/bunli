import { useId, useMemo, useState } from 'react'
import type { SelectOption } from '@opentui/core'
import { useScopedKeyboard } from './focus-scope.js'
import { useFormField } from './form-context.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'

export interface MultiSelectOption extends SelectOption {
  label?: string
  hint?: string
  disabled?: boolean
}

export interface MultiSelectFieldProps {
  label: string
  name: string
  options: MultiSelectOption[]
  required?: boolean
  description?: string
  defaultValue?: Array<SelectOption['value']>
  scopeId?: string
}

function nextEnabledIndex(options: MultiSelectOption[], from: number, delta: number): number {
  if (options.length === 0) return 0
  for (let step = 0; step < options.length; step += 1) {
    const next = (from + delta * (step + 1) + options.length) % options.length
    if (!options[next]?.disabled) return next
  }
  return from
}

const multiSelectKeymap = createKeyMatcher({
  up: ['up', 'k'],
  down: ['down', 'j'],
  toggle: ['space'],
  submit: ['enter']
})

export function MultiSelectField({
  label,
  name,
  options,
  required,
  description,
  defaultValue = [],
  scopeId
}: MultiSelectFieldProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const field = useFormField<Array<SelectOption['value']>>(name, {
    defaultValue,
    submitOnEnter: false
  })
  const keyboardScopeId = scopeId ?? `multiselect:${name}:${reactScopeId}`
  const [activeIndex, setActiveIndex] = useState(() => options.findIndex((option) => !option.disabled))
  const selectedSet = useMemo(() => new Set(field.value ?? []), [field.value])

  const commit = (next: Set<SelectOption['value']>) => {
    field.setValue(
      options
        .filter((option) => next.has(option.value))
        .map((option) => option.value)
    )
    field.blur()
  }

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (!field.focused) return false

      if (multiSelectKeymap.match('up', key)) {
        setActiveIndex((prev) => nextEnabledIndex(options, prev, -1))
        return true
      }

      if (multiSelectKeymap.match('down', key)) {
        setActiveIndex((prev) => nextEnabledIndex(options, prev, 1))
        return true
      }

      if (multiSelectKeymap.match('toggle', key)) {
        const option = options[activeIndex]
        if (!option || option.disabled) return false
        const next = new Set(selectedSet)
        if (next.has(option.value)) {
          next.delete(option.value)
        } else {
          next.add(option.value)
        }
        commit(next)
        return true
      }

      if (multiSelectKeymap.match('submit', key)) {
        if (!required || selectedSet.size > 0) {
          field.blur()
          return true
        }
      }

      return false
    },
    { active: field.focused }
  )

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text content={`${label}${required ? ' *' : ''}`} fg={tokens.textPrimary} />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box border padding={1} style={{ flexDirection: 'column', gap: 1, borderColor: field.error ? tokens.textDanger : tokens.borderMuted }}>
        {options.map((option, index) => {
          const focused = field.focused && index === activeIndex
          const selected = selectedSet.has(option.value)
          const marker = selected ? '[x]' : '[ ]'
          const labelText = option.label ?? option.name
          const hintText = option.hint ?? option.description
          const disabled = option.disabled ? ' [disabled]' : ''
          return (
            <text
              key={`${name}-${option.value}`}
              content={`${focused ? '>' : ' '} ${marker} ${labelText}${hintText ? ` - ${hintText}` : ''}${disabled}`}
              fg={option.disabled ? tokens.textMuted : focused ? tokens.accent : tokens.textPrimary}
            />
          )
        })}
      </box>
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
