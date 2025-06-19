/**
 * Progress bar component
 */

import React from 'react'
import { Box, Text } from '@bunli/renderer'
import type { BoxProps } from '@bunli/renderer'

export interface ProgressBarProps extends Omit<BoxProps, 'children'> {
  /**
   * Progress value between 0 and 1
   */
  value: number
  /**
   * Width of the progress bar in characters
   */
  width?: number
  /**
   * Character to use for filled portion
   */
  fillChar?: string
  /**
   * Character to use for empty portion
   */
  emptyChar?: string
  /**
   * Show percentage text
   */
  showPercent?: boolean
  /**
   * Custom label
   */
  label?: string
  /**
   * Color for filled portion
   */
  fillColor?: string
  /**
   * Color for empty portion
   */
  emptyColor?: string
}

export function ProgressBar({
  value,
  width = 20,
  fillChar = '█',
  emptyChar = '░',
  showPercent = true,
  label,
  fillColor = 'green',
  emptyColor = 'gray',
  style,
  ...props
}: ProgressBarProps) {
  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value))
  const filled = Math.round(width * clampedValue)
  const empty = width - filled
  
  const percentText = showPercent ? ` ${Math.round(clampedValue * 100)}%` : ''
  
  const percentage = Math.round(clampedValue * 100)
  
  return (
    <Box style={style} {...props}>
      {label && <Text>{label}</Text>}
      <Box direction="horizontal">
        <Text style={{ color: fillColor }}>{fillChar.repeat(filled)}</Text>
        <Text style={{ color: emptyColor }}>{emptyChar.repeat(empty)}</Text>
        {showPercent && <Text> {percentage}%</Text>}
      </Box>
    </Box>
  )
}

// Convenience component for indeterminate progress
export function IndeterminateProgress({
  width = 20,
  speed = 100,
  style,
  ...props
}: Omit<ProgressBarProps, 'value'> & { speed?: number }) {
  const [position, setPosition] = React.useState(0)
  const [direction, setDirection] = React.useState(1)
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setPosition(p => {
        const next = p + direction
        if (next >= width - 5 || next <= 0) {
          setDirection(-direction)
        }
        return Math.max(0, Math.min(width - 5, next))
      })
    }, speed)
    
    return () => clearInterval(timer)
  }, [width, speed, direction])
  
  return (
    <Box style={style} {...props}>
      <Text>
        {'░'.repeat(position)}
        {'█'.repeat(5)}
        {'░'.repeat(Math.max(0, width - position - 5))}
      </Text>
    </Box>
  )
}