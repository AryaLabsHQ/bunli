import { useState } from 'react'
import { DialogDismissedError, useDialogManager } from '@bunli/runtime/app'
import { Menu, Stack, Toast } from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

export function DialogFlowRecipe({
  active,
  focusToken,
  previewWidth,
  stateKey
}: GalleryRenderContext) {
  const dialogs = useDialogManager()
  const [result, setResult] = useState('No dialog result yet.')

  const openConfirm = () => {
    void (async () => {
      try {
        const confirmed = await dialogs.confirm({
          title: 'Ship release',
          message: 'Promote this TUI component change to stable?',
          confirmLabel: 'Ship',
          cancelLabel: 'Hold'
        })
        setResult(confirmed ? 'Confirmed release.' : 'Held release.')
      } catch (error) {
        if (error instanceof DialogDismissedError) {
          setResult('Confirm dialog dismissed.')
          return
        }
        setResult(`Dialog error: ${String(error)}`)
      }
    })()
  }

  const openChoose = () => {
    void (async () => {
      try {
        const target = await dialogs.choose({
          title: 'Target environment',
          message: 'Select the rollout target for this recipe:',
          options: [
            { label: 'Development', value: 'dev', section: 'General' },
            { label: 'Staging', value: 'staging', section: 'General' },
            { label: 'Production', value: 'prod', section: 'Protected', disabled: stateKey === 'confirm' }
          ]
        })
        setResult(`Selected environment: ${target}`)
      } catch (error) {
        if (error instanceof DialogDismissedError) {
          setResult('Choose dialog dismissed.')
          return
        }
        setResult(`Dialog error: ${String(error)}`)
      }
    })()
  }

  return (
    <Stack gap={1}>
      <Menu
        title='Dialog Actions'
        items={[
          { key: 'confirm', label: 'Open Confirm', description: 'Yes/no protected action' },
          { key: 'choose', label: 'Open Choose', description: 'Multi-option picker' }
        ]}
        scopeId={`gallery:recipe:dialogs:${focusToken}`}
        keyboardEnabled={active}
        maxLineWidth={Math.max(34, previewWidth - 6)}
        onSelect={(key) => {
          if (key === 'confirm') {
            openConfirm()
            return
          }
          openChoose()
        }}
      />
      <Toast title='Last dialog result' message={result} tone='info' />
    </Stack>
  )
}
