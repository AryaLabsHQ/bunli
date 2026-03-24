export type JoinAlignment = 'top' | 'center' | 'bottom' | 'left' | 'right'

const ANSI_REGEX = /\x1b\[[0-9;]*m/g

function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '')
}

function visibleWidth(str: string): number {
  return stripAnsi(str).length
}

function padToWidth(str: string, targetWidth: number, align: 'left' | 'center' | 'right'): string {
  const currentWidth = visibleWidth(str)
  const diff = targetWidth - currentWidth
  if (diff <= 0) return str

  switch (align) {
    case 'left':
      return str + ' '.repeat(diff)
    case 'right':
      return ' '.repeat(diff) + str
    case 'center': {
      const left = Math.floor(diff / 2)
      const right = diff - left
      return ' '.repeat(left) + str + ' '.repeat(right)
    }
  }
}

/**
 * Join multi-line text blocks side by side (horizontal).
 * Each block is a string that may contain newlines.
 * Alignment applies to the cross-axis (vertical alignment of blocks).
 */
export function joinHorizontal(align: JoinAlignment, ...blocks: string[]): string {
  if (blocks.length === 0) return ''
  if (blocks.length === 1) return blocks[0]

  // Split each block into lines
  const splitBlocks = blocks.map((b) => b.split('\n'))

  // Find the tallest block
  const maxHeight = Math.max(...splitBlocks.map((b) => b.length))

  // Find the widest line in each block
  const blockWidths = splitBlocks.map((lines) => Math.max(0, ...lines.map(visibleWidth)))

  // Pad each block to the same height based on alignment
  const paddedBlocks = splitBlocks.map((lines, i) => {
    const height = lines.length
    const diff = maxHeight - height
    if (diff === 0) return lines

    const emptyLine = ''
    let topPad = 0
    let bottomPad = 0

    switch (align) {
      case 'top':
      case 'left':
        bottomPad = diff
        break
      case 'bottom':
      case 'right':
        topPad = diff
        break
      case 'center': {
        topPad = Math.floor(diff / 2)
        bottomPad = diff - topPad
        break
      }
    }

    return [
      ...Array<string>(topPad).fill(emptyLine),
      ...lines,
      ...Array<string>(bottomPad).fill(emptyLine),
    ]
  })

  // Concatenate corresponding lines
  const result: string[] = []
  for (let row = 0; row < maxHeight; row++) {
    const parts = paddedBlocks.map((lines, i) => padToWidth(lines[row], blockWidths[i], 'left'))
    result.push(parts.join(' '))
  }

  return result.join('\n')
}

/**
 * Join multi-line text blocks stacked (vertical).
 * Alignment applies to the cross-axis (horizontal alignment of blocks).
 */
export function joinVertical(align: JoinAlignment, ...blocks: string[]): string {
  if (blocks.length === 0) return ''
  if (blocks.length === 1) return blocks[0]

  // Split each block into lines
  const splitBlocks = blocks.map((b) => b.split('\n'))

  // Find the widest block
  const allLines = splitBlocks.flat()
  const maxWidth = Math.max(0, ...allLines.map(visibleWidth))

  // Map alignment to horizontal pad direction
  let padAlign: 'left' | 'center' | 'right'
  switch (align) {
    case 'left':
    case 'top':
      padAlign = 'left'
      break
    case 'right':
    case 'bottom':
      padAlign = 'right'
      break
    case 'center':
      padAlign = 'center'
      break
  }

  // Pad each line to the max width and concatenate
  const result = splitBlocks.flatMap((lines) => lines.map((line) => padToWidth(line, maxWidth, padAlign)))

  return result.join('\n')
}
