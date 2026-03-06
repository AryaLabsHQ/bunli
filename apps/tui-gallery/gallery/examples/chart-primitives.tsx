import { BarChart, LineChart, Sparkline } from '@bunli/tui/charts'
import { Stack } from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

export function ChartPrimitivesExample({ previewWidth, stateKey }: GalleryRenderContext) {
  const releaseSeries = [
    { label: 'Mon', value: 2 },
    { label: 'Tue', value: 4 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 6 },
    { label: 'Fri', value: 5 }
  ]
  const latencySeries = [
    { label: 'api', value: 22 },
    { label: 'queue', value: 14 },
    { label: 'cache', value: 8 }
  ]

  return (
    <Stack gap={1}>
      <BarChart
        series={{
          name: stateKey === 'latency' ? 'Latency envelope' : 'Weekly releases',
          points: stateKey === 'latency' ? latencySeries : releaseSeries
        }}
        width={Math.max(24, Math.min(40, previewWidth - 18))}
      />
      <LineChart
        series={{
          name: stateKey === 'latency' ? 'p95 trend' : 'Adoption curve',
          points: stateKey === 'latency'
            ? [{ value: 18 }, { value: 22 }, { value: 20 }, { value: 25 }, { value: 19 }]
            : [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 5 }, { value: 8 }]
        }}
        width={Math.max(20, Math.min(64, previewWidth - 12))}
      />
      <Sparkline
        values={stateKey === 'latency' ? [22, 18, 24, 19, 17, 21, 18] : [1, 3, 2, 5, 4, 6, 8]}
        width={Math.max(20, Math.min(64, previewWidth - 12))}
      />
    </Stack>
  )
}
