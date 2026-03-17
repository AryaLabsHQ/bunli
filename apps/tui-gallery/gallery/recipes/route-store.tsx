import { useEffect } from 'react'
import { useRouteStore } from '@bunli/runtime/app'
import { KeyValueList, Menu, Stack } from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

export function RouteStoreRecipe({
  active,
  focusToken,
  previewWidth,
  stateKey
}: GalleryRenderContext) {
  const routeStore = useRouteStore()

  useEffect(() => {
    routeStore.reset()
  }, [routeStore, stateKey])

  const actions = stateKey === 'replace'
    ? [
        { key: 'home', label: 'Replace to Home', description: 'replace(home)' },
        { key: 'details', label: 'Replace to Details', description: 'replace(details)' },
        { key: 'history', label: 'Reset Stack', description: 'reset()' }
      ]
    : [
        { key: 'home', label: 'Navigate to Home', description: 'navigate(home)' },
        { key: 'details', label: 'Navigate to Details', description: 'navigate(details)' },
        { key: 'back', label: 'Back', description: routeStore.canGoBack ? 'back()' : 'disabled', disabled: !routeStore.canGoBack }
      ]

  return (
    <Stack gap={1}>
      <Menu
        title='Route Actions'
        items={actions}
        scopeId={`gallery:recipe:routes:${focusToken}`}
        keyboardEnabled={active}
        maxLineWidth={Math.max(34, previewWidth - 6)}
        onSelect={(key) => {
          if (stateKey === 'replace') {
            if (key === 'history') {
              routeStore.reset()
              return
            }
            routeStore.replace(key)
            return
          }

          if (key === 'back') {
            routeStore.back()
            return
          }
          routeStore.navigate(key)
        }}
      />
      <KeyValueList
        items={[
          { key: 'current route', value: routeStore.route },
          { key: 'previous', value: routeStore.previousRoute ?? 'none' },
          { key: 'history size', value: routeStore.history.length },
          { key: 'mode', value: stateKey === 'replace' ? 'replace/reset' : 'navigate/back' }
        ]}
        maxLineWidth={Math.max(34, previewWidth - 6)}
        fillWidth
      />
    </Stack>
  )
}
