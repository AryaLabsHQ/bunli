import { TaggedError } from 'better-result'
import type { RuntimeTransport } from '../transport.js'

export type ImageRenderMode = 'off' | 'auto' | 'on'

export type ImageProtocol = 'kitty' | 'none'

export type ImageProtocolPreference = 'auto' | 'kitty'

export type ImageRenderReason =
  | 'mode-off'
  | 'not-interactive'
  | 'capability-missing'
  | 'protocol-unsupported'
  | 'aborted'
  | 'invalid-input'
  | 'io-error'
  | 'render-failed'

export interface ImageCapability {
  supported: boolean
  protocol: ImageProtocol
  reason?: Exclude<ImageRenderReason, 'mode-off' | 'invalid-input' | 'io-error' | 'render-failed'>
  terminal?: string
}

export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp'

export type RenderImageInput =
  | {
      kind: 'path'
      path: string
      mimeType?: ImageMimeType
    }
  | {
      kind: 'bytes'
      bytes: Uint8Array
      mimeType: ImageMimeType
    }

export interface RenderImageOptions {
  mode?: ImageRenderMode
  protocol?: ImageProtocolPreference
  width?: number
  height?: number
  signal?: AbortSignal
  stdout?: NodeJS.WriteStream
  env?: NodeJS.ProcessEnv
  transport?: RuntimeTransport
}

export interface RenderImageResult {
  rendered: boolean
  protocol: ImageProtocol
  reason?: ImageRenderReason
  bytesWritten?: number
}

export class ImageRenderError extends TaggedError('ImageRenderError')<{
  message: string
  code: ImageRenderReason
  protocol: ImageProtocol
}>() {}
