import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { emitRuntimeEvent } from '../transport.js'
import { detectImageCapability } from './capability.js'
import { shouldFailOnImageMiss } from './mode.js'
import type {
  ImageMimeType,
  ImageProtocol,
  RenderImageInput,
  RenderImageOptions,
  RenderImageResult
} from './types.js'
import { ImageRenderError } from './types.js'

const KITTY_CHUNK_SIZE = 4096

function inferMimeTypeFromPath(path: string): ImageMimeType | undefined {
  const extension = extname(path).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'
  return undefined
}

function mimeTypeToKittyFormat(mimeType: ImageMimeType): number {
  if (mimeType === 'image/png') return 100
  if (mimeType === 'image/jpeg') return 24
  return 32
}

function throwIfAborted(signal: AbortSignal | undefined, protocol: ImageProtocol = 'none'): void {
  if (!signal?.aborted) return
  throw new ImageRenderError({
    message: 'Image rendering aborted',
    code: 'aborted',
    protocol
  })
}

function normalizeDimensions(width: number | undefined, height: number | undefined): { width?: number; height?: number } {
  if (width !== undefined && (!Number.isFinite(width) || width <= 0)) {
    throw new ImageRenderError({
      message: 'Invalid width for image rendering',
      code: 'invalid-input',
      protocol: 'none'
    })
  }
  if (height !== undefined && (!Number.isFinite(height) || height <= 0)) {
    throw new ImageRenderError({
      message: 'Invalid height for image rendering',
      code: 'invalid-input',
      protocol: 'none'
    })
  }
  return {
    width: width ? Math.floor(width) : undefined,
    height: height ? Math.floor(height) : undefined
  }
}

function writeStdout(stdout: NodeJS.WriteStream, chunk: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const size = Buffer.byteLength(chunk)
    const ok = stdout.write(chunk, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve(size)
    })
    if (ok) return
    stdout.once('drain', () => resolve(size))
  })
}

async function writeKittyImage(
  bytes: Uint8Array,
  mimeType: ImageMimeType,
  options: { stdout: NodeJS.WriteStream; width?: number; height?: number; signal?: AbortSignal }
): Promise<number> {
  const payload = Buffer.from(bytes).toString('base64')
  const format = mimeTypeToKittyFormat(mimeType)
  const totalChunks = Math.max(1, Math.ceil(payload.length / KITTY_CHUNK_SIZE))
  let bytesWritten = 0

  for (let index = 0; index < totalChunks; index += 1) {
    throwIfAborted(options.signal, 'kitty')
    const start = index * KITTY_CHUNK_SIZE
    const end = start + KITTY_CHUNK_SIZE
    const part = payload.slice(start, end)
    const hasMore = index < totalChunks - 1

    const params = [`a=T`, `f=${format}`, `m=${hasMore ? 1 : 0}`]
    if (options.width) params.push(`c=${options.width}`)
    if (options.height) params.push(`r=${options.height}`)

    const sequence = `\x1b_G${params.join(',')};${part}\x1b\\`
    bytesWritten += await writeStdout(options.stdout, sequence)
  }

  return bytesWritten
}

function returnOrThrow(
  mode: 'off' | 'auto' | 'on',
  result: RenderImageResult,
  protocol: ImageProtocol = 'none'
): RenderImageResult {
  if (shouldFailOnImageMiss(mode) && !result.rendered) {
    throw new ImageRenderError({
      message: result.reason ?? 'render-failed',
      code: result.reason ?? 'render-failed',
      protocol
    })
  }
  return result
}

async function readInputBytes(input: RenderImageInput): Promise<{ bytes: Uint8Array; mimeType: ImageMimeType }> {
  if (input.kind === 'bytes') {
    if (input.bytes.length === 0) {
      throw new ImageRenderError({
        message: 'Image bytes input is empty',
        code: 'invalid-input',
        protocol: 'none'
      })
    }
    return {
      bytes: input.bytes,
      mimeType: input.mimeType
    }
  }

  const mimeType = input.mimeType ?? inferMimeTypeFromPath(input.path)
  if (!mimeType) {
    throw new ImageRenderError({
      message: 'Could not infer image MIME type from path',
      code: 'invalid-input',
      protocol: 'none'
    })
  }

  try {
    const bytes = await readFile(input.path)
    if (bytes.length === 0) {
      throw new ImageRenderError({
        message: 'Image path contains no bytes',
        code: 'invalid-input',
        protocol: 'none'
      })
    }
    return { bytes, mimeType }
  } catch (error) {
    if (error instanceof ImageRenderError) throw error
    throw new ImageRenderError({
      message: `Failed reading image path: ${input.path}`,
      code: 'io-error',
      protocol: 'none'
    })
  }
}

export async function renderImage(
  input: RenderImageInput,
  options: RenderImageOptions = {}
): Promise<RenderImageResult> {
  const mode = options.mode ?? 'auto'
  const emitResult = async (result: RenderImageResult): Promise<void> => {
    await emitRuntimeEvent(options.transport, {
      type: 'runtime.image.render.result',
      timestamp: Date.now(),
      rendered: result.rendered,
      protocol: result.protocol,
      reason: result.reason
    })
  }
  const finalize = async (result: RenderImageResult, protocol: ImageProtocol = result.protocol): Promise<RenderImageResult> => {
    await emitResult(result)
    return returnOrThrow(mode, result, protocol)
  }

  if (mode === 'off') {
    await emitRuntimeEvent(options.transport, {
      type: 'runtime.image.render.attempt',
      timestamp: Date.now(),
      mode,
      protocol: 'none'
    })
    return finalize({
      rendered: false,
      protocol: 'none',
      reason: 'mode-off'
    })
  }

  throwIfAborted(options.signal)
  const stdout = options.stdout ?? process.stdout
  const env = options.env ?? process.env
  const protocolPreference = options.protocol ?? 'auto'
  const capability = detectImageCapability({ env, stdout })

  if (!capability.supported) {
    const reason = capability.reason ?? 'capability-missing'
    await emitRuntimeEvent(options.transport, {
      type: 'runtime.image.render.attempt',
      timestamp: Date.now(),
      mode,
      protocol: 'none'
    })
    return finalize({ rendered: false, protocol: 'none', reason }, 'none')
  }

  if (protocolPreference === 'kitty' && capability.protocol !== 'kitty') {
    await emitRuntimeEvent(options.transport, {
      type: 'runtime.image.render.attempt',
      timestamp: Date.now(),
      mode,
      protocol: capability.protocol
    })
    return finalize({
      rendered: false,
      protocol: capability.protocol,
      reason: 'protocol-unsupported'
    }, capability.protocol)
  }
  await emitRuntimeEvent(options.transport, {
    type: 'runtime.image.render.attempt',
    timestamp: Date.now(),
    mode,
    protocol: 'kitty'
  })

  let dimensions: { width?: number; height?: number }
  try {
    dimensions = normalizeDimensions(options.width, options.height)
  } catch (error) {
    if (error instanceof ImageRenderError) {
      return finalize({
        rendered: false,
        protocol: capability.protocol,
        reason: error.code
      }, capability.protocol)
    }
    throw error
  }

  let bytes: Uint8Array
  let mimeType: ImageMimeType
  try {
    const resolved = await readInputBytes(input)
    bytes = resolved.bytes
    mimeType = resolved.mimeType
  } catch (error) {
    if (error instanceof ImageRenderError) {
      return finalize({
        rendered: false,
        protocol: capability.protocol,
        reason: error.code
      }, capability.protocol)
    }
    throw error
  }

  try {
    const bytesWritten = await writeKittyImage(bytes, mimeType, {
      stdout,
      width: dimensions.width,
      height: dimensions.height,
      signal: options.signal
    })
    return finalize({
      rendered: true,
      protocol: 'kitty',
      bytesWritten
    }, 'kitty')
  } catch (error) {
    if (error instanceof ImageRenderError && error.code === 'aborted') throw error
    return finalize({
      rendered: false,
      protocol: 'kitty',
      reason: 'render-failed'
    }, 'kitty')
  }
}
