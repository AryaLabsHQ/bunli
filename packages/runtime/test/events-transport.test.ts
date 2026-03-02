import { describe, expect, test } from 'bun:test'
import { RuntimeEventSchema } from '../src/events.js'
import { emitRuntimeEvent, type RuntimeTransport } from '../src/transport.js'

describe('@bunli/runtime events/transport', () => {
  test('validates runtime events', () => {
    const parsed = RuntimeEventSchema.safeParse({
      type: 'runtime.renderer.started',
      timestamp: Date.now(),
      bufferMode: 'standard'
    })

    expect(parsed.success).toBe(true)
  })

  test('emits validated events through transport', async () => {
    const sent: unknown[] = []
    const transport: RuntimeTransport = {
      send(event) {
        sent.push(event)
      }
    }

    await emitRuntimeEvent(transport, {
      type: 'runtime.renderer.destroyed',
      timestamp: Date.now()
    })

    expect(sent).toHaveLength(1)
  })
})
