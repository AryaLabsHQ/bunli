import type { ReactNode } from 'react'

export interface StackProps {
  children: ReactNode
  direction?: 'row' | 'column'
  gap?: number
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  padding?: number
  border?: boolean
  title?: string
  style?: Record<string, unknown>
}

export function Stack({
  children,
  direction = 'column',
  gap = 1,
  align,
  justify,
  padding,
  border = false,
  title,
  style = {}
}: StackProps) {
  return (
    <box
      border={border}
      title={title}
      padding={padding}
      style={{
        flexDirection: direction,
        gap,
        alignItems: align,
        justifyContent: justify,
        ...style
      }}
    >
      {children}
    </box>
  )
}
