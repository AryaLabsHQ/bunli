import type { ReactNode } from 'react'
import { Panel, type PanelTone } from './panel.js'
import type { ComponentEmphasis, ComponentSize } from './variant.js'

export interface CardProps {
  title: string
  description?: string
  tone?: PanelTone
  size?: ComponentSize
  emphasis?: ComponentEmphasis
  children?: ReactNode
}

export function Card({
  title,
  description,
  tone = 'default',
  size = 'md',
  emphasis = 'subtle',
  children
}: CardProps) {
  return (
    <Panel title={title} subtitle={description} tone={tone} size={size} emphasis={emphasis}>
      {children}
    </Panel>
  )
}
