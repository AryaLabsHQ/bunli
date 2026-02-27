import { useTuiTheme } from '../components/theme.js'

export interface SeriesPoint {
  label?: string
  value: number
}

export interface ChartSeries {
  name?: string
  points: SeriesPoint[]
}

export interface BarChartProps {
  series: ChartSeries
  width?: number
  color?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function maxValue(points: SeriesPoint[]): number {
  const max = points.reduce((m, p) => Math.max(m, p.value), 0)
  return max <= 0 ? 1 : max
}

export function BarChart({ series, width = 24, color }: BarChartProps) {
  const { tokens } = useTuiTheme()
  const max = maxValue(series.points)
  const barColor = color ?? tokens.accent
  return (
    <box style={{ flexDirection: 'column' }}>
      {series.points.map((p, idx) => {
        const barLength = clamp(Math.round((p.value / max) * width), 0, width)
        const bar = '█'.repeat(barLength)
        return <text key={`bar-${idx}`} content={`${p.label ?? idx}: ${bar} ${p.value}`} fg={barColor} />
      })}
    </box>
  )
}

export interface LineChartProps {
  series: ChartSeries
  color?: string
}

export function LineChart({ series, color }: LineChartProps) {
  const { tokens } = useTuiTheme()
  const values = series.points.map((p) => p.value)
  const joined = values.map((value, idx) => `${idx === 0 ? '' : '─'}${value}`).join('')
  return (
    <box style={{ flexDirection: 'column' }}>
      <text content={series.name ? `${series.name}:` : 'Line:'} fg={tokens.textMuted} />
      <text content={joined} fg={color ?? tokens.accent} />
    </box>
  )
}

export interface SparklineProps {
  values: number[]
  color?: string
}

const SPARKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

export function Sparkline({ values, color }: SparklineProps) {
  const { tokens } = useTuiTheme()
  if (values.length === 0) return <text content="" fg={tokens.textMuted} />
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const spark = values
    .map((value) => {
      const normalized = (value - min) / range
      const index = clamp(Math.round(normalized * (SPARKS.length - 1)), 0, SPARKS.length - 1)
      return SPARKS[index] ?? '▁'
    })
    .join('')

  return <text content={spark} fg={color ?? tokens.accent} />
}
