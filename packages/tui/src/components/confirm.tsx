import { useId, useState } from 'react'
import type { KeyEvent } from '@opentui/core'
import { useScopedKeyboard, createKeyMatcher, useTuiTheme } from '@bunli/runtime/app'

export interface ConfirmProps {
  message: string
  defaultValue?: boolean
  affirmativeLabel?: string
  negativeLabel?: string
  onConfirm?: (value: boolean) => void
  onAbort?: () => void
  scopeId?: string
  keyboardEnabled?: boolean
}

const confirmKeymap = createKeyMatcher({
  toggle: ['left', 'right', 'h', 'l', 'tab'],
  affirm: ['y'],
  negate: ['n', 'q'],
  submit: ['enter'],
  abort: ['escape']
})

export function Confirm({
  message,
  defaultValue = false,
  affirmativeLabel = 'Yes',
  negativeLabel = 'No',
  onConfirm,
  onAbort,
  scopeId,
  keyboardEnabled = true
}: ConfirmProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `confirm:${reactScopeId}`
  const [selected, setSelected] = useState(defaultValue)

  useScopedKeyboard(
    keyboardScopeId,
    (key: KeyEvent) => {
      if (confirmKeymap.match('toggle', key)) {
        setSelected((prev) => !prev)
        return true
      }

      if (confirmKeymap.match('affirm', key)) {
        setSelected(true)
        return true
      }

      if (confirmKeymap.match('negate', key)) {
        setSelected(false)
        return true
      }

      if (confirmKeymap.match('submit', key)) {
        onConfirm?.(selected)
        return true
      }

      if (confirmKeymap.match('abort', key)) {
        onAbort?.()
        return true
      }

      return false
    },
    { active: keyboardEnabled }
  )

  return (
    <box style={{ flexDirection: 'row', gap: 1 }}>
      <text content={message} fg={tokens.textPrimary} />
      <text content={affirmativeLabel} fg={selected ? tokens.accent : tokens.textMuted} bold={selected} />
      <text content="/" fg={tokens.textMuted} />
      <text content={negativeLabel} fg={!selected ? tokens.accent : tokens.textMuted} bold={!selected} />
    </box>
  )
}
