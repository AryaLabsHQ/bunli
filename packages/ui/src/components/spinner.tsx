/**
 * Spinner component for loading states
 */

import React, { useState, useEffect } from 'react'
import { Text } from '@bunli/renderer'
import type { TextProps } from '@bunli/renderer'

export interface SpinnerProps extends Omit<TextProps, 'children'> {
  /**
   * Type of spinner animation
   */
  type?: 'dots' | 'line' | 'circle' | 'square' | 'triangle' | 'bouncingBar'
  /**
   * Animation speed in milliseconds
   */
  speed?: number
  /**
   * Text to show next to spinner
   */
  label?: string
}

const spinners = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  circle: ['◐', '◓', '◑', '◒'],
  square: ['◰', '◳', '◲', '◱'],
  triangle: ['◢', '◣', '◤', '◥'],
  bouncingBar: ['[    ]', '[●   ]', '[●●  ]', '[●●● ]', '[ ●●●]', '[  ●●]', '[   ●]', '[    ]'],
}

export function Spinner({ 
  type = 'dots', 
  speed = 80, 
  label = '',
  style,
  ...props 
}: SpinnerProps) {
  const [frame, setFrame] = useState(0)
  const frames = spinners[type]
  
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % frames.length)
    }, speed)
    
    return () => clearInterval(timer)
  }, [speed, frames.length])
  
  return (
    <Text style={style} {...props}>
      {frames[frame]} {label}
    </Text>
  )
}

// Convenience components for common spinner types
export function LoadingSpinner(props: Omit<SpinnerProps, 'type'>) {
  return <Spinner type="dots" {...props} />
}

export function ProgressSpinner(props: Omit<SpinnerProps, 'type'>) {
  return <Spinner type="bouncingBar" {...props} />
}