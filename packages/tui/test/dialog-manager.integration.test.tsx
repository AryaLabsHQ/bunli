import { afterEach, describe, expect, test } from 'bun:test'
import { testRender } from '@opentui/react/test-utils'
import { act, useEffect, useRef, type ReactNode } from 'react'
import {
  DialogDismissedError,
  DialogProvider,
  useDialogManager,
  type DialogManager
} from '../src/components/dialog-manager.js'
import { FocusScopeProvider } from '../src/components/focus-scope.js'
import { OverlayHostProvider } from '../src/components/overlay-host.js'

type TestSetup = Awaited<ReturnType<typeof testRender>>

const activeSetups: TestSetup[] = []

async function flushFrames(renderOnce: () => Promise<void>, count = 8): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await renderOnce()
    await Promise.resolve()
  }
}

async function waitFor(renderOnce: () => Promise<void>, check: () => boolean, attempts = 24): Promise<boolean> {
  for (let index = 0; index < attempts; index += 1) {
    if (check()) return true
    await act(async () => {
      await flushFrames(renderOnce, 1)
    })
  }
  return check()
}

function withProviders(node: ReactNode) {
  return (
    <FocusScopeProvider>
      <OverlayHostProvider>
        <DialogProvider>{node}</DialogProvider>
      </OverlayHostProvider>
    </FocusScopeProvider>
  )
}

async function setup(node: ReactNode): Promise<TestSetup> {
  const rendered = await testRender(withProviders(node), {
    width: 90,
    height: 28,
    useConsole: false,
    useAlternateScreen: false,
    useMouse: false,
    enableMouseMovement: false,
    exitOnCtrlC: false
  })
  activeSetups.push(rendered)
  await act(async () => {
    await flushFrames(rendered.renderOnce)
  })
  return rendered
}

afterEach(async () => {
  while (activeSetups.length > 0) {
    const testSetup = activeSetups.pop()
    if (!testSetup) continue
    if (!testSetup.renderer.isDestroyed) {
      await act(async () => {
        testSetup.renderer.destroy()
      })
    }
  }
})

describe('@bunli/tui dialog manager integration', () => {
  test('confirm resolves on Enter', async () => {
    let resolvedValue: boolean | null = null
    let rejectedError: unknown = null

    function Harness() {
      const dialogs = useDialogManager()
      const openedRef = useRef(false)

      useEffect(() => {
        if (openedRef.current) return
        openedRef.current = true

        void dialogs.confirm({
          title: 'Confirm deploy',
          message: 'Ship release?'
        })
          .then((value) => {
            resolvedValue = value
          })
          .catch((error) => {
            rejectedError = error
          })
      }, [dialogs])

      return null
    }

    const rendered = await setup(<Harness />)
    const ready = await waitFor(rendered.renderOnce, () => rendered.captureCharFrame().includes('Confirm deploy'))
    expect(ready).toBe(true)

    await act(async () => {
      rendered.mockInput.pressEnter()
      await flushFrames(rendered.renderOnce)
    })

    expect(resolvedValue).toBe(true)
    expect(rejectedError).toBeNull()
  })

  test('choose rejects with DialogDismissedError on Escape', async () => {
    let selectedValue: string | null = null
    let rejectedError: unknown = null

    function Harness() {
      const dialogs = useDialogManager()
      const openedRef = useRef(false)

      useEffect(() => {
        if (openedRef.current) return
        openedRef.current = true

        void dialogs.choose({
          title: 'Environment',
          options: [
            { label: 'Development', value: 'dev' },
            { label: 'Staging', value: 'staging' }
          ]
        })
          .then((value) => {
            selectedValue = value
          })
          .catch((error) => {
            rejectedError = error
          })
      }, [dialogs])

      return null
    }

    const rendered = await setup(<Harness />)
    const ready = await waitFor(rendered.renderOnce, () => rendered.captureCharFrame().includes('Environment'))
    expect(ready).toBe(true)

    await act(async () => {
      rendered.mockInput.pressCtrlC()
      await flushFrames(rendered.renderOnce)
    })

    const settled = await waitFor(rendered.renderOnce, () => rejectedError !== null || selectedValue !== null)
    expect(settled).toBe(true)
    expect(selectedValue).toBeNull()
    expect(rejectedError).toBeInstanceOf(DialogDismissedError)
  })

  test('choose resolves to nearest enabled option when initialIndex points to disabled item', async () => {
    let selectedValue: string | null = null
    let rejectedError: unknown = null

    function Harness() {
      const dialogs = useDialogManager()
      const openedRef = useRef(false)

      useEffect(() => {
        if (openedRef.current) return
        openedRef.current = true

        void dialogs.choose({
          title: 'Environment',
          initialIndex: 0,
          options: [
            { label: 'Development', value: 'dev', disabled: true },
            { label: 'Staging', value: 'staging' },
            { label: 'Production', value: 'prod' }
          ]
        })
          .then((value) => {
            selectedValue = value
          })
          .catch((error) => {
            rejectedError = error
          })
      }, [dialogs])

      return null
    }

    const rendered = await setup(<Harness />)
    const ready = await waitFor(rendered.renderOnce, () => rendered.captureCharFrame().includes('Environment'))
    expect(ready).toBe(true)

    await act(async () => {
      rendered.mockInput.pressEnter()
      await flushFrames(rendered.renderOnce)
    })

    expect(selectedValue).toBe('staging')
    expect(rejectedError).toBeNull()
  })

  test('choose rejects when no enabled options exist', async () => {
    let rejectedError: unknown = null

    function Harness() {
      const dialogs = useDialogManager()
      const openedRef = useRef(false)

      useEffect(() => {
        if (openedRef.current) return
        openedRef.current = true

        void dialogs.choose({
          title: 'Disabled',
          options: [
            { label: 'A', value: 'a', disabled: true },
            { label: 'B', value: 'b', disabled: true }
          ]
        }).catch((error) => {
          rejectedError = error
        })
      }, [dialogs])

      return null
    }

    const rendered = await setup(<Harness />)
    const settled = await waitFor(rendered.renderOnce, () => rejectedError !== null)
    expect(settled).toBe(true)
    expect(String(rejectedError)).toContain('at least one enabled option')
  })

  test('top dialog id and count update when stacked dialogs are closed', async () => {
    let manager: DialogManager | null = null

    function Harness() {
      const dialogs = useDialogManager()
      const openedRef = useRef(false)
      manager = dialogs

      useEffect(() => {
        if (openedRef.current) return
        openedRef.current = true

        void dialogs.openDialog(() => null, { id: 'low', priority: 1 }).catch(() => {})
        void dialogs.openDialog(() => null, { id: 'high', priority: 10 }).catch(() => {})
      }, [dialogs])

      return null
    }

    const rendered = await setup(<Harness />)

    expect(manager?.topDialogId).toBe('high')
    expect(manager?.dialogCount).toBe(2)

    await act(async () => {
      manager?.closeDialog('high')
      await flushFrames(rendered.renderOnce)
    })

    expect(manager?.topDialogId).toBe('low')
    expect(manager?.dialogCount).toBe(1)

    await act(async () => {
      manager?.clearDialogs()
      await flushFrames(rendered.renderOnce)
    })

    expect(manager?.topDialogId).toBeNull()
    expect(manager?.dialogCount).toBe(0)
  })
})
