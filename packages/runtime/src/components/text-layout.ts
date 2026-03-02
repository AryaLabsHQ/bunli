export type TextOverflowMode = 'ellipsis' | 'clip'

export function displayWidth(value: string): number {
  return Bun.stringWidth(value)
}

function sliceByDisplayWidth(value: string, maxWidth: number): string {
  if (maxWidth <= 0) return ''

  let output = ''
  for (const char of value) {
    const next = `${output}${char}`
    if (displayWidth(next) > maxWidth) break
    output = next
  }
  return output
}

export function truncateEnd(
  value: string,
  maxWidth: number,
  options: {
    overflow?: TextOverflowMode
    ellipsis?: string
  } = {}
): string {
  if (maxWidth <= 0) return ''

  const overflow = options.overflow ?? 'ellipsis'
  const ellipsis = options.ellipsis ?? '...'
  const currentWidth = displayWidth(value)
  if (currentWidth <= maxWidth) return value

  if (overflow === 'clip') {
    return sliceByDisplayWidth(value, maxWidth)
  }

  const ellipsisWidth = displayWidth(ellipsis)
  if (maxWidth <= ellipsisWidth) {
    return sliceByDisplayWidth(value, maxWidth)
  }

  return `${sliceByDisplayWidth(value, maxWidth - ellipsisWidth)}${ellipsis}`
}

export function padEndTo(value: string, width: number): string {
  if (width <= 0) return ''
  const currentWidth = displayWidth(value)
  if (currentWidth >= width) return value
  return `${value}${' '.repeat(width - currentWidth)}`
}

export function formatFixedWidth(
  value: string,
  width: number,
  options: {
    overflow?: TextOverflowMode
    ellipsis?: string
  } = {}
): string {
  return padEndTo(truncateEnd(value, width, options), width)
}
