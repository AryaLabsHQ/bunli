export interface ProgressBarProps {
  value: number // 0-100
  label?: string
  color?: string
}

export function ProgressBar({ value, label, color = '#00ff00' }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value))
  
  return (
    <box style={{ flexDirection: 'column' }}>
      {label && <text content={label} />}
      <box style={{ backgroundColor: '#333', height: 3, marginTop: 0.5 }}>
        <box 
          style={{ 
            width: `${clampedValue}%`, 
            backgroundColor: color,
            height: 1 
          }} 
        />
      </box>
      <text content={`${Math.floor(clampedValue)}%`} style={{ marginTop: 0.5 }} />
    </box>
  )
}
