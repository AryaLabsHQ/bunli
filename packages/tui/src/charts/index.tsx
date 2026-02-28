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
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function maxValue(points: SeriesPoint[]): number {
  const max = points.reduce((m, p) => Math.max(m, p.value), 0)
  return max <= 0 ? 1 : max
}

export function BarChart({ series, width = 24 }: BarChartProps) {
  const max = maxValue(series.points)
  return (
    <box style={{ flexDirection: 'column' }}>
      {series.points.map((p, idx) => {
        const barLength = clamp(Math.round((p.value / max) * width), 0, width)
        const bar = '█'.repeat(barLength)
        return <text key={`bar-${idx}`} content={`${p.label ?? idx}: ${bar} ${p.value}`} />
      })}
    </box>
  )
}

export interface LineChartProps {
  series: ChartSeries
}

export function LineChart({ series }: LineChartProps) {
  const values = series.points.map((p) => p.value)
  const joined = values.map((value, idx) => `${idx === 0 ? '' : '─'}${value}`).join('')
  return (
    <box style={{ flexDirection: 'column' }}>
      <text content={series.name ? `${series.name}:` : 'Line:'} />
      <text content={joined} />
    </box>
  )
}

export interface SparklineProps {
  values: number[]
}

const SPARKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

export function Sparkline({ values }: SparklineProps) {
  if (values.length === 0) return <text content="" />
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

  return <text content={spark} />
}
