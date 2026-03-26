import { useEffect, useState } from 'react'
import { useTuiTheme } from '@bunli/runtime/app'

export type SpinnerVariant = 'line' | 'dot' | 'minidot' | 'jump' | 'pulse' | 'points' | 'globe' | 'moon' | 'monkey' | 'meter' | 'hamburger'

export const SPINNERS: Record<SpinnerVariant, { frames: string[]; interval: number }> = {
  line:      { frames: ['|', '/', '-', '\\'], interval: 130 },
  dot:       { frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'], interval: 80 },
  minidot:   { frames: ['⠄', '⠂', '⠁', '⠈', '⠐', '⠠'], interval: 100 },
  jump:      { frames: ['⢀⠀', '⡀⠀', '⠄⠀', '⢂⠀', '⡂⠀', '⠅⠀', '⢃⠀', '⡃⠀', '⠍⠀', '⢋⠀', '⡋⠀', '⠍⠁', '⢋⠁', '⡋⠁', '⠍⠉', '⠋⠉', '⠋⠉', '⠉⠙', '⠉⠙', '⠉⠩', '⠈⢙', '⠈⡙', '⢈⠩', '⡂⠩', '⠅⠩', '⢃⠩', '⡃⠩', '⠍⠩', '⢋⠩', '⡋⠩', '⠍⠩', '⢋⠩', '⡋⠩', '⠍⢉', '⠍⡉', '⠍⠋'], interval: 100 },
  pulse:     { frames: ['█', '▓', '▒', '░', '▒', '▓'], interval: 120 },
  points:    { frames: ['∙∙∙', '●∙∙', '∙●∙', '∙∙●'], interval: 200 },
  globe:     { frames: ['🌍', '🌎', '🌏'], interval: 200 },
  moon:      { frames: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'], interval: 120 },
  monkey:    { frames: ['🙈', '🙉', '🙊'], interval: 300 },
  meter:     { frames: ['▱▱▱▱▱▱▱', '▰▱▱▱▱▱▱', '▰▰▱▱▱▱▱', '▰▰▰▱▱▱▱', '▰▰▰▰▱▱▱', '▰▰▰▰▰▱▱', '▰▰▰▰▰▰▱', '▰▰▰▰▰▰▰'], interval: 120 },
  hamburger: { frames: ['☱', '☲', '☴'], interval: 150 },
}

export interface SpinnerProps {
  variant?: SpinnerVariant
  title?: string
  align?: 'left' | 'right'
  speed?: number
}

export function Spinner({ variant = 'dot', title, align = 'left', speed }: SpinnerProps) {
  const { tokens } = useTuiTheme()
  const spinner = SPINNERS[variant]
  const { frames } = spinner
  const interval = speed ?? spinner.interval
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length)
    }, interval)
    return () => clearInterval(id)
  }, [frames.length, interval])

  const frame = frames[frameIndex] ?? frames[0]!

  return (
    <box style={{ flexDirection: 'row', gap: 1 }}>
      {align === 'left' && <text content={frame} fg={tokens.accent} />}
      {title && <text content={title} fg={tokens.textPrimary} />}
      {align === 'right' && <text content={frame} fg={tokens.accent} />}
    </box>
  )
}
