import { useTuiTheme } from './theme.js'

export interface ProgressBarProps {
  value: number // 0-100
  label?: string
  color?: string
}

export function ProgressBar({ value, label, color }: ProgressBarProps) {
  const { tokens } = useTuiTheme()
  const clampedValue = Math.max(0, Math.min(100, value))
  const activeColor = color ?? tokens.accent
  
  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      {label && <text content={label} fg={tokens.textPrimary} />}
      <box style={{ backgroundColor: tokens.backgroundMuted, height: 3, marginTop: 0.5 }}>
        <box 
          style={{ 
            width: `${clampedValue}%`, 
            backgroundColor: activeColor,
            height: 1 
          }} 
        />
      </box>
      <text content={`${Math.floor(clampedValue)}%`} fg={tokens.textMuted} style={{ marginTop: 0.5 }} />
    </box>
  )
}
