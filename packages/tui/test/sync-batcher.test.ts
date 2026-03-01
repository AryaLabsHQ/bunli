import { describe, expect, test } from 'bun:test'
import { createSyncBatcher } from '../src/utils/sync-batcher.js'

describe('@bunli/tui sync batcher', () => {
  test('batches microtask updates into a single flush', async () => {
    const flushed: number[][] = []
    const batcher = createSyncBatcher<number>((actions) => {
      flushed.push(actions)
    })

    batcher.enqueue(1)
    batcher.enqueue(2)
    batcher.enqueue(3)

    await Promise.resolve()

    expect(flushed).toEqual([[1, 2, 3]])
    batcher.dispose()
  })

  test('supports manual flush and clear semantics', () => {
    const flushed: string[][] = []
    const batcher = createSyncBatcher<string>((actions) => {
      flushed.push(actions)
    })

    batcher.enqueue('a')
    batcher.enqueue('b')
    batcher.flush()

    expect(flushed).toEqual([['a', 'b']])
    expect(batcher.size()).toBe(0)

    batcher.enqueue('c')
    batcher.clear()
    batcher.flush()
    expect(flushed).toEqual([['a', 'b']])

    batcher.dispose()
  })

  test('supports timeout scheduler mode', async () => {
    const flushed: number[][] = []
    const batcher = createSyncBatcher<number>(
      (actions) => {
        flushed.push(actions)
      },
      { mode: 'timeout', delayMs: 5 }
    )

    batcher.enqueue(7)
    batcher.enqueue(8)
    expect(flushed.length).toBe(0)

    await new Promise((resolve) => setTimeout(resolve, 15))
    expect(flushed).toEqual([[7, 8]])

    batcher.dispose()
  })
})

