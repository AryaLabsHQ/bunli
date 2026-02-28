import { useMemo } from 'react'
import { useTuiTheme } from '../components/theme.js'

export interface SeriesPoint {
  label?: string
  value?: number | null
}

export interface ChartSeries {
  name?: string
  color?: string
  points: SeriesPoint[]
}

export interface AxisOptions {
  xLabel?: string
  yLabel?: string
  min?: number
  max?: number
  showRange?: boolean
}

export type ChartSeriesInput = ChartSeries | ChartSeries[]
export type ValueFormatter = (value: number, point: SeriesPoint) => string

export interface ChartDomain {
  min: number
  max: number
  maxAbs: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toSeriesArray(series: ChartSeriesInput): ChartSeries[] {
  return Array.isArray(series) ? series : [series]
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value)) return null
  return value
}

function computeDomain(seriesList: ChartSeries[], axis?: AxisOptions): ChartDomain {
  const values = seriesList
    .flatMap((series) => series.points)
    .map((point) => toNumber(point.value))
    .filter((value): value is number => value !== null)

  const minFromValues = values.length > 0 ? Math.min(...values) : 0
  const maxFromValues = values.length > 0 ? Math.max(...values) : 0

  const min = axis?.min ?? Math.min(minFromValues, 0)
  const max = axis?.max ?? Math.max(maxFromValues, 0)
  const maxAbs = Math.max(Math.abs(min), Math.abs(max), 1)

  return { min, max, maxAbs }
}

function defaultFormatter(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function paletteAt(index: number, fallback: string, palette?: string[]): string {
  if (palette && palette.length > 0) {
    return palette[index % palette.length] ?? fallback
  }
  return fallback
}

function pointLabel(point: SeriesPoint, index: number): string {
  return point.label ?? `#${index + 1}`
}

function renderBarLine(args: {
  point: SeriesPoint
  index: number
  maxAbs: number
  halfWidth: number
  formatter: ValueFormatter
}): string {
  const value = toNumber(args.point.value)
  const label = pointLabel(args.point, args.index)

  if (value === null) {
    return `${label}: ${' '.repeat(args.halfWidth)}|${' '.repeat(args.halfWidth)} ·`
  }

  const ratio = clamp(Math.abs(value) / args.maxAbs, 0, 1)
  const width = Math.round(ratio * args.halfWidth)
  const negativeBar = value < 0 ? '█'.repeat(width).padStart(args.halfWidth, ' ') : ' '.repeat(args.halfWidth)
  const positiveBar = value > 0 ? '█'.repeat(width).padEnd(args.halfWidth, ' ') : ' '.repeat(args.halfWidth)

  return `${label}: ${negativeBar}|${positiveBar} ${args.formatter(value, args.point)}`
}

const SPARKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

function renderSparkline(values: Array<number | null>, min: number, max: number, placeholder = '·'): string {
  const span = max - min || 1

  return values
    .map((value) => {
      if (value === null) return placeholder
      const normalized = (value - min) / span
      const index = clamp(Math.round(normalized * (SPARKS.length - 1)), 0, SPARKS.length - 1)
      return SPARKS[index] ?? SPARKS[0] ?? '▁'
    })
    .join('')
}

export interface BarChartProps {
  series: ChartSeriesInput
  width?: number
  color?: string
  palette?: string[]
  axis?: AxisOptions
  valueFormatter?: ValueFormatter
}

export function BarChart({
  series,
  width = 24,
  color,
  palette,
  axis,
  valueFormatter = (value) => defaultFormatter(value)
}: BarChartProps) {
  const { tokens } = useTuiTheme()
  const seriesList = toSeriesArray(series)
  const domain = useMemo(() => computeDomain(seriesList, axis), [axis, seriesList])
  const halfWidth = Math.max(6, Math.floor(width / 2))

  return (
    <box style={{ flexDirection: 'column' }}>
      {axis?.yLabel ? <text content={axis.yLabel} fg={tokens.textMuted} /> : null}

      {seriesList.map((item, seriesIndex) => {
        const seriesColor = item.color ?? color ?? paletteAt(seriesIndex, tokens.accent, palette)
        return (
          <box key={`bar-series-${seriesIndex}`} style={{ flexDirection: 'column' }}>
            {item.name ? <text content={`${item.name}:`} fg={tokens.textMuted} /> : null}
            {item.points.map((point, pointIndex) => (
              <text
                key={`bar-point-${seriesIndex}-${pointIndex}`}
                content={renderBarLine({
                  point,
                  index: pointIndex,
                  maxAbs: domain.maxAbs,
                  halfWidth,
                  formatter: valueFormatter
                })}
                fg={seriesColor}
              />
            ))}
          </box>
        )
      })}

      {axis?.showRange !== false ? (
        <text content={`${domain.min} <- 0 -> ${domain.max}`} fg={tokens.textMuted} />
      ) : null}
      {axis?.xLabel ? <text content={axis.xLabel} fg={tokens.textMuted} /> : null}
    </box>
  )
}

export interface LineChartProps {
  series: ChartSeriesInput
  color?: string
  palette?: string[]
  axis?: AxisOptions
}

export function LineChart({ series, color, palette, axis }: LineChartProps) {
  const { tokens } = useTuiTheme()
  const seriesList = toSeriesArray(series)
  const domain = useMemo(() => computeDomain(seriesList, axis), [axis, seriesList])

  return (
    <box style={{ flexDirection: 'column' }}>
      {axis?.yLabel ? <text content={axis.yLabel} fg={tokens.textMuted} /> : null}
      {seriesList.map((item, seriesIndex) => {
        const seriesColor = item.color ?? color ?? paletteAt(seriesIndex, tokens.accent, palette)
        const points = item.points.map((point) => toNumber(point.value))
        const sparkline = renderSparkline(points, domain.min, domain.max)
        const name = item.name ?? `Series ${seriesIndex + 1}`

        return (
          <text
            key={`line-series-${seriesIndex}`}
            content={`${name}: ${sparkline}`}
            fg={seriesColor}
          />
        )
      })}
      {axis?.showRange !== false ? (
        <text content={`${domain.min} … ${domain.max}`} fg={tokens.textMuted} />
      ) : null}
      {axis?.xLabel ? <text content={axis.xLabel} fg={tokens.textMuted} /> : null}
    </box>
  )
}

export interface SparklineProps {
  values: Array<number | null | undefined>
  color?: string
  min?: number
  max?: number
  placeholder?: string
}

export function Sparkline({ values, color, min, max, placeholder = '·' }: SparklineProps) {
  const { tokens } = useTuiTheme()
  if (values.length === 0) return <text content="" fg={tokens.textMuted} />

  const normalizedValues = values.map((value) => toNumber(value))
  const valid = normalizedValues.filter((value): value is number => value !== null)
  const computedMin = min ?? (valid.length > 0 ? Math.min(...valid) : 0)
  const computedMax = max ?? (valid.length > 0 ? Math.max(...valid) : 0)
  const spark = renderSparkline(normalizedValues, computedMin, computedMax, placeholder)

  return <text content={spark} fg={color ?? tokens.accent} />
}

export const __chartInternalsForTests = {
  clamp,
  toSeriesArray,
  toNumber,
  computeDomain,
  renderBarLine,
  renderSparkline
}
