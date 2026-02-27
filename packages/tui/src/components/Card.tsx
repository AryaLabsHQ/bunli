import type { ReactNode } from 'react'
import { Panel, type PanelTone } from './Panel.js'

export interface CardProps {
  title: string
  description?: string
  tone?: PanelTone
  children?: ReactNode
}

export function Card({ title, description, tone = 'default', children }: CardProps) {
  return (
    <Panel title={title} subtitle={description} tone={tone}>
      {children}
    </Panel>
  )
}
