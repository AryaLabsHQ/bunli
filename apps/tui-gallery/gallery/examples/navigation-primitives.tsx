import { useState } from 'react'
import {
  CommandPalette,
  DataTable,
  KeyValueList,
  Menu,
  Stack,
  Tabs
} from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

export function NavigationPrimitivesExample({
  active,
  focusToken,
  previewWidth,
  stateKey
}: GalleryRenderContext) {
  const [lastAction, setLastAction] = useState('none')

  if (stateKey === 'tabs') {
    return (
      <Tabs
        initialKey='overview'
        scopeId={`gallery:navigation:tabs:${focusToken}`}
        keyboardEnabled={active}
        tabs={[
          {
            key: 'overview',
            label: 'Overview',
            content: (
              <KeyValueList
                items={[
                  { key: 'Pattern', value: 'Tabs' },
                  { key: 'Keys', value: 'Left/Right or h/l' },
                  { key: 'Use', value: 'Switch view content in-place' }
                ]}
                maxLineWidth={Math.max(30, previewWidth - 8)}
                fillWidth
              />
            )
          },
          {
            key: 'detail',
            label: 'Detail',
            content: <text content='Tabs are useful for small in-place mode switches inside a single route.' />
          },
          {
            key: 'history',
            label: 'History',
            content: <text content='Keep tab content focused; for bigger transitions prefer route changes.' />
          }
        ]}
      />
    )
  }

  if (stateKey === 'table') {
    return (
      <DataTable
        columns={[
          { key: 'name', label: 'Package' },
          { key: 'surface', label: 'Surface' },
          { key: 'status', label: 'Status' }
        ]}
        rows={[
          { name: '@bunli/core', surface: 'CLI framework', status: 'stable' },
          { name: '@bunli/tui', surface: 'terminal UI', status: 'active' },
          { name: '@bunli/runtime', surface: 'runtime primitives', status: 'active' }
        ]}
        scopeId={`gallery:navigation:table:${focusToken}`}
        keyboardEnabled={active}
        maxLineWidth={Math.max(40, previewWidth - 6)}
        fillWidth
      />
    )
  }

  if (stateKey === 'palette') {
    return (
      <CommandPalette
        items={[
          { key: 'open-docs', label: 'Open docs guide', hint: 'docs' },
          { key: 'focus-preview', label: 'Focus preview pane', hint: 'f4' },
          { key: 'toggle-theme', label: 'Toggle theme', hint: 'alt+t' },
          { key: 'cycle-width', label: 'Cycle width preset', hint: 'alt+w' }
        ]}
        scopeId={`gallery:navigation:palette:${focusToken}`}
        keyboardEnabled={active}
        inputFocused={active}
        maxLineWidth={Math.max(30, previewWidth - 6)}
      />
    )
  }

  return (
    <Stack gap={1}>
      <Menu
        title='Action Menu'
        items={[
          { key: 'open', label: 'Open Example', description: 'Inspect the current entry' },
          { key: 'state', label: 'Switch State', description: 'Change the active example state' },
          { key: 'source', label: 'View Source', description: 'Jump to source references' }
        ]}
        scopeId={`gallery:navigation:menu:${focusToken}`}
        keyboardEnabled={active}
        maxLineWidth={Math.max(30, previewWidth - 6)}
        onSelect={(key) => {
          setLastAction(key)
        }}
      />
      <KeyValueList
        items={[
          { key: 'last action', value: lastAction },
          { key: 'focus', value: active ? 'preview' : 'shell' }
        ]}
        maxLineWidth={Math.max(30, previewWidth - 6)}
        fillWidth
      />
    </Stack>
  )
}
