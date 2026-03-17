import { useEffect, useId, useRef, type ReactNode } from 'react'
import type { BoxRenderable, Renderable } from '@opentui/core'
import { useRenderer } from '@opentui/react'
import { createKeyMatcher } from './keymap.js'
import { useScopedKeyboard } from './focus-scope.js'
import { OverlayPortal } from './overlay-host.js'
import { useTuiTheme } from './theme.js'

export interface ModalProps {
  isOpen: boolean
  title: string
  children: ReactNode
  onClose?: () => void
  closeHint?: string
  scopeId?: string
  zIndex?: number
}

const modalKeymap = createKeyMatcher({
  close: ['escape', 'ctrl+c'],
  trap: ['tab', 'shift+tab']
})

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  closeHint = 'Esc to close',
  scopeId,
  zIndex = 1000
}: ModalProps) {
  const { tokens } = useTuiTheme()
  const renderer = useRenderer()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `modal:${title}:${reactScopeId}`
  const modalRef = useRef<BoxRenderable | null>(null)
  const previousFocusedRef = useRef<Renderable | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      previousFocusedRef.current = renderer.currentFocusedRenderable

      const focusTarget = modalRef.current
      if (focusTarget) {
        renderer.focusRenderable(focusTarget)
      }
    }

    if (!isOpen && wasOpenRef.current) {
      const previous = previousFocusedRef.current
      if (previous) {
        try {
          renderer.focusRenderable(previous)
        } catch {
          // Ignore restore failures if previous focus target was destroyed.
        }
      }
    }

    wasOpenRef.current = isOpen
  }, [isOpen, renderer])

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (!isOpen) return false

      if (modalKeymap.match('close', key)) {
        onClose?.()
        return true
      }

      if (modalKeymap.match('trap', key)) {
        const focusTarget = modalRef.current
        if (focusTarget) {
          renderer.focusRenderable(focusTarget)
        }
        return true
      }

      return false
    },
    { active: isOpen, priority: 100 }
  )

  return (
    <OverlayPortal active={isOpen} priority={zIndex}>
      <box
        position='absolute'
        top={1}
        left={2}
        right={2}
        zIndex={zIndex}
        border
        padding={2}
        title={title}
        focusable
        ref={modalRef}
        style={{
          flexDirection: 'column',
          gap: 1,
          borderColor: tokens.accent,
          backgroundColor: tokens.backgroundMuted
        }}
      >
        {children}
        <text content={closeHint} fg={tokens.textMuted} />
      </box>
    </OverlayPortal>
  )
}
