import { z } from 'zod'

export const RuntimeRenderBufferModeSchema = z.enum(['alternate', 'standard'])

export const RuntimeRendererStartedEventSchema = z.object({
  type: z.literal('runtime.renderer.started'),
  timestamp: z.number().int().nonnegative(),
  bufferMode: RuntimeRenderBufferModeSchema.optional()
})

export const RuntimeRendererMissingRenderEventSchema = z.object({
  type: z.literal('runtime.renderer.missing-render'),
  timestamp: z.number().int().nonnegative()
})

export const RuntimeRendererDestroyedEventSchema = z.object({
  type: z.literal('runtime.renderer.destroyed'),
  timestamp: z.number().int().nonnegative()
})

export const RuntimeImageRenderAttemptEventSchema = z.object({
  type: z.literal('runtime.image.render.attempt'),
  timestamp: z.number().int().nonnegative(),
  mode: z.enum(['off', 'auto', 'on']),
  protocol: z.enum(['kitty', 'none'])
})

export const RuntimeImageRenderResultEventSchema = z.object({
  type: z.literal('runtime.image.render.result'),
  timestamp: z.number().int().nonnegative(),
  rendered: z.boolean(),
  protocol: z.enum(['kitty', 'none']),
  reason: z.string().optional()
})

export const RuntimePromptStartedEventSchema = z.object({
  type: z.literal('runtime.prompt.started'),
  timestamp: z.number().int().nonnegative(),
  promptType: z.enum(['text', 'password', 'confirm', 'select', 'multiselect', 'group', 'session'])
})

export const RuntimePromptCancelledEventSchema = z.object({
  type: z.literal('runtime.prompt.cancelled'),
  timestamp: z.number().int().nonnegative(),
  promptType: z.enum(['text', 'password', 'confirm', 'select', 'multiselect', 'group', 'session'])
})

export const RuntimeTransportErrorEventSchema = z.object({
  type: z.literal('runtime.transport.error'),
  timestamp: z.number().int().nonnegative(),
  message: z.string()
})

export const RuntimeEventSchema = z.discriminatedUnion('type', [
  RuntimeRendererStartedEventSchema,
  RuntimeRendererMissingRenderEventSchema,
  RuntimeRendererDestroyedEventSchema,
  RuntimeImageRenderAttemptEventSchema,
  RuntimeImageRenderResultEventSchema,
  RuntimePromptStartedEventSchema,
  RuntimePromptCancelledEventSchema,
  RuntimeTransportErrorEventSchema
])

export type RuntimeRendererStartedEvent = z.infer<typeof RuntimeRendererStartedEventSchema>
export type RuntimeRendererMissingRenderEvent = z.infer<typeof RuntimeRendererMissingRenderEventSchema>
export type RuntimeRendererDestroyedEvent = z.infer<typeof RuntimeRendererDestroyedEventSchema>
export type RuntimeImageRenderAttemptEvent = z.infer<typeof RuntimeImageRenderAttemptEventSchema>
export type RuntimeImageRenderResultEvent = z.infer<typeof RuntimeImageRenderResultEventSchema>
export type RuntimePromptStartedEvent = z.infer<typeof RuntimePromptStartedEventSchema>
export type RuntimePromptCancelledEvent = z.infer<typeof RuntimePromptCancelledEventSchema>
export type RuntimeTransportErrorEvent = z.infer<typeof RuntimeTransportErrorEventSchema>
export type RuntimeEvent = z.infer<typeof RuntimeEventSchema>
export type RuntimeEventType = RuntimeEvent['type']
