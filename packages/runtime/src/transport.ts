import { RuntimeEventSchema, type RuntimeEvent } from './events.js'

export interface RuntimeTransport {
  send(event: RuntimeEvent): void | Promise<void>
}

export interface RuntimeTransportObserver {
  onTransportError?(error: unknown, event: RuntimeEvent): void
}

export async function emitRuntimeEvent(
  transport: RuntimeTransport | undefined,
  event: RuntimeEvent,
  observer?: RuntimeTransportObserver
): Promise<void> {
  if (!transport) return

  const parsed = RuntimeEventSchema.safeParse(event)
  if (!parsed.success) {
    observer?.onTransportError?.(parsed.error, event)
    return
  }

  try {
    await transport.send(parsed.data)
  } catch (error) {
    observer?.onTransportError?.(error, parsed.data)
  }
}
