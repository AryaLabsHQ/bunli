import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useScopedKeyboard } from './focus-scope.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'

export interface TabItem {
  key: string
  label: string
  content: ReactNode
}

export interface TabsProps {
  tabs: TabItem[]
  initialKey?: string
  activeKey?: string
  onChange?: (key: string) => void
  scopeId?: string
  keyboardEnabled?: boolean
}

const tabsKeymap = createKeyMatcher({
  previous: ['left', 'h'],
  next: ['right', 'l']
})

export function Tabs({
  tabs,
  initialKey,
  activeKey,
  onChange,
  scopeId,
  keyboardEnabled = true
}: TabsProps) {
  const { tokens } = useTuiTheme()
  const reactScopeId = useId()
  const keyboardScopeId = scopeId ?? `tabs:${reactScopeId}`
  const [internalKey, setInternalKey] = useState<string>(() => initialKey ?? tabs[0]?.key ?? '')
  const currentKey = activeKey ?? internalKey
  const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.key === currentKey))

  const selectIndex = (index: number) => {
    const tab = tabs[index]
    if (!tab) return
    if (activeKey === undefined) {
      setInternalKey(tab.key)
    }
    onChange?.(tab.key)
  }

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (tabs.length === 0) return false
      if (tabsKeymap.match('previous', key)) {
        const next = (currentIndex - 1 + tabs.length) % tabs.length
        selectIndex(next)
        return true
      }
      if (tabsKeymap.match('next', key)) {
        const next = (currentIndex + 1) % tabs.length
        selectIndex(next)
        return true
      }
      return false
    },
    { active: keyboardEnabled }
  )

  const activeTab = useMemo(() => tabs[currentIndex] ?? null, [tabs, currentIndex])

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      <box style={{ flexDirection: 'row', gap: 2 }}>
        {tabs.map((tab, index) => {
          const isActive = index === currentIndex
          const label = isActive ? `[${tab.label}]` : tab.label
          return (
            <text
              key={tab.key}
              content={label}
              fg={isActive ? tokens.accent : tokens.textMuted}
            />
          )
        })}
      </box>
      <box border padding={1} style={{ borderColor: tokens.border }}>
        {activeTab?.content ?? <text content="" />}
      </box>
    </box>
  )
}
