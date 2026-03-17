import { afterEach, describe, expect, test } from 'bun:test'
import { RuntimeProvider as RuntimeTestProvider } from '@bunli/runtime/app'
import { testRender } from '@opentui/react/test-utils'
import { act, useState, type ReactNode } from 'react'
import {
  NavList,
  ScrollPanel,
  SidebarLayout,
  moveSelectableNavIndex,
  resolveSidebarLayoutMode
} from '../src/interactive/index.js'

type TestSetup = Awaited<ReturnType<typeof testRender>>

const activeSetups: TestSetup[] = []

async function flushFrames(renderOnce: () => Promise<void>, count = 4): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await renderOnce()
    await Promise.resolve()
  }
}

function normalizeFrame(frame: string) {
  return frame.replaceAll('\u00a0', ' ')
}

async function setup(
  node: ReactNode,
  options?: { width?: number; height?: number; useMouse?: boolean; withRuntime?: boolean }
) {
  const rendered = await testRender(
    options?.withRuntime === false ? node : <RuntimeTestProvider>{node}</RuntimeTestProvider>,
    {
      width: options?.width ?? 90,
      height: options?.height ?? 28,
      useConsole: false,
      useAlternateScreen: false,
      useMouse: options?.useMouse ?? false,
      enableMouseMovement: options?.useMouse ?? false,
      exitOnCtrlC: false
    }
  )
  activeSetups.push(rendered)
  await act(async () => {
    await flushFrames(rendered.renderOnce)
  })
  return rendered
}

afterEach(async () => {
  while (activeSetups.length > 0) {
    const rendered = activeSetups.pop()
    if (!rendered) continue
    if (!rendered.renderer.isDestroyed) {
      await act(async () => {
        rendered.renderer.destroy()
      })
    }
  }
})

describe('@bunli/tui shell primitives', () => {
  test('ScrollPanel renders sticky header, body, and footer chrome', async () => {
    const rendered = await setup(
      <ScrollPanel
        title='Example Pane'
        subtitle='Sticky chrome'
        footer={<text content='Footer actions' />}
        focused
      >
        <text content='Hello body' />
      </ScrollPanel>
    )

    const frame = rendered.captureCharFrame()
    expect(frame).toContain('Example Pane')
    expect(frame).toContain('Sticky chrome')
    expect(frame).toContain('Hello body')
    expect(frame).toContain('Footer actions')
  })

  test('NavList selection logic skips disabled rows', () => {
    const items = [
      { key: 'alpha', label: 'Alpha' },
      { key: 'beta', label: 'Beta', disabled: true },
      { key: 'gamma', label: 'Gamma' }
    ]

    expect(moveSelectableNavIndex(items, 0, 1)).toBe(2)
    expect(moveSelectableNavIndex(items, 2, -1)).toBe(0)
  })

  test('NavList renders pointer-targetable rows', async () => {
    function Harness() {
      const [value, setValue] = useState('alpha')

      return (
        <NavList
          id='nav-test'
          value={value}
          onChange={setValue}
          keyboardEnabled
          pointerEnabled
          items={[
            { key: 'alpha', label: 'Alpha' },
            { key: 'beta', label: 'Beta' },
            { key: 'gamma', label: 'Gamma' }
          ]}
        />
      )
    }

    const rendered = await setup(<Harness />, { width: 60, height: 16, useMouse: true, withRuntime: false })
    const gammaRow = rendered.renderer.root.findDescendantById('nav-test--row-gamma')
    expect(gammaRow).toBeDefined()
    expect(normalizeFrame(rendered.captureCharFrame())).toContain('Gamma')
  })

  test('NavList can wrap long labels across multiple lines', async () => {
    const rendered = await setup(
      <NavList
        id='nav-wrap-test'
        keyboardEnabled
        wrapLabels
        maxLabelLines={2}
        maxLineWidth={18}
        items={[
          { key: 'alpha', label: 'Feedback / Status' },
          { key: 'beta', label: 'Navigation / Data' }
        ]}
      />,
      { width: 28, height: 16, withRuntime: false }
    )

    const frame = normalizeFrame(rendered.captureCharFrame())
    expect(frame).toContain('Feedback /')
    expect(frame).toContain('Status')
    expect(frame).toContain('Navigation /')
    expect(frame).toContain('Data')
  })

  test('SidebarLayout resolves responsive modes from terminal width', () => {
    expect(resolveSidebarLayoutMode(150, 'auto', { mediumMinWidth: 100, wideMinWidth: 132 })).toBe('wide')
    expect(resolveSidebarLayoutMode(112, 'auto', { mediumMinWidth: 100, wideMinWidth: 132 })).toBe('medium')
    expect(resolveSidebarLayoutMode(88, 'auto', { mediumMinWidth: 100, wideMinWidth: 132 })).toBe('narrow')
  })

  test('SidebarLayout renders narrow pane switching chrome', async () => {
    const rendered = await setup(
      <SidebarLayout
        mode='narrow'
        activePane='content'
        paneLabels={{
          sidebar: 'Browse',
          content: 'Preview',
          inspector: 'Info'
        }}
        sidebar={<text content='Sidebar content' />}
        content={<text content='Preview content' />}
        inspector={<text content='Inspector content' />}
      />,
      { width: 80, height: 20, useMouse: true }
    )

    const frame = rendered.captureCharFrame()
    expect(frame).toContain('[Preview]')
    expect(frame).toContain('Browse')
    expect(frame).toContain('Info')
    expect(frame).toContain('Preview content')
  })
})
