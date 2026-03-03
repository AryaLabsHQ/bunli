/** @jsxImportSource @opentui/react */
import { useKeyboard } from '@opentui/react'
import type { ReactNode } from 'react'
import type { KeyEvent } from '@opentui/core'
import { createKeyMatcher } from '../../components/keymap.js'
import { debugInput, isCtrlCRawSequence, isEscapeRawSequence } from './open-tui-debug.js'

const promptKeymap = createKeyMatcher({
  cancel: ['escape', 'ctrl+c']
})

export function isEscapeKeyboardEvent(event: KeyEvent): boolean {
  const keyName = event.name?.toLowerCase()
  const keyCode = event.code?.toLowerCase()
  const sequence = event.sequence ?? ''
  if (keyName === 'escape' || keyName === 'esc') return true
  if (keyCode === 'escape') return true
  if (isEscapeRawSequence(sequence)) return true
  return false
}

export function isCtrlCKeyboardEvent(event: KeyEvent): boolean {
  const keyName = event.name?.toLowerCase()
  const sequence = event.sequence ?? ''
  if (isCtrlCRawSequence(sequence)) return true
  if (event.ctrl && (keyName === 'c' || sequence.toLowerCase() === 'c')) return true
  if (promptKeymap.match('cancel', event) && event.ctrl) return true
  return false
}

export function isCancelKeyboardEvent(event: KeyEvent): boolean {
  return isEscapeKeyboardEvent(event) || isCtrlCKeyboardEvent(event)
}

export function emitInterruptSignal(source: string) {
  debugInput(`interrupt source="${source}"`)
  if (process.stdout.isTTY) process.stdout.write('\n')
  process.kill(process.pid, 'SIGINT')
}

export function useCancelKey(onCancel: () => void) {
  useKeyboard((event) => {
    if (!isCancelKeyboardEvent(event)) return
    event.preventDefault?.()
    event.stopPropagation?.()
    if (isCtrlCKeyboardEvent(event)) {
      emitInterruptSignal('useCancelKey')
      return
    }
    onCancel()
  })
}

interface PromptCancelBoundaryProps {
  onCancel: () => void
  children: ReactNode
}

export function PromptCancelBoundary({ onCancel, children }: PromptCancelBoundaryProps) {
  useKeyboard((event) => {
    if (!isCancelKeyboardEvent(event)) return
    event.preventDefault?.()
    event.stopPropagation?.()
    if (isCtrlCKeyboardEvent(event)) {
      emitInterruptSignal('promptBoundary')
      return
    }
    onCancel()
  })
  return <>{children}</>
}
