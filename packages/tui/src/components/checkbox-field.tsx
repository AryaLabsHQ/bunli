import { useId } from 'react'
import { useScopedKeyboard } from './focus-scope.js'
import { useFormField } from './form-context.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'

export interface CheckboxFieldProps {
  label: string
  name: string
  description?: string
  defaultValue?: boolean
  scopeId?: string
}

const checkboxKeymap = createKeyMatcher({
  toggle: ['space', 'enter']
})

export function CheckboxField({ label, name, description, defaultValue = false, scopeId }: CheckboxFieldProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const field = useFormField<boolean>(name, {
    defaultValue,
    submitOnEnter: false
  })
  const keyboardScopeId = scopeId ?? `checkbox:${name}:${reactScopeId}`

  const toggle = () => {
    field.setValue(!field.value)
    field.blur()
  }

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (!field.focused) return false
      if (checkboxKeymap.match('toggle', key)) {
        toggle()
        return true
      }
      return false
    },
    { active: field.focused }
  )

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1, gap: 1 }}>
      <text
        content={`${field.focused ? '>' : ' '} ${field.value ? '[x]' : '[ ]'} ${label}`}
        fg={field.focused ? tokens.accent : tokens.textPrimary}
      />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  )
}
