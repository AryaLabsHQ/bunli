import {
  Alert,
  Badge,
  EmptyState,
  Grid,
  Panel,
  Progress,
  Stack,
  Stat,
  Toast
} from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

export function FeedbackPrimitivesExample({ previewWidth, stateKey }: GalleryRenderContext) {
  if (stateKey === 'badges') {
    return (
      <Stack gap={1}>
        <Panel title='Badge Variants' subtitle='Tone + emphasis communicate status fast' tone='accent'>
          <Stack direction='row' gap={1}>
            <Badge label='default' />
            <Badge label='accent' tone='accent' />
            <Badge label='success' tone='success' />
            <Badge label='warning' tone='warning' />
            <Badge label='danger' tone='danger' />
          </Stack>
          <Stack direction='row' gap={1}>
            <Badge label='subtle' tone='accent' emphasis='subtle' />
            <Badge label='outline' tone='accent' emphasis='outline' />
            <Badge label='solid' tone='accent' emphasis='solid' />
          </Stack>
        </Panel>
      </Stack>
    )
  }

  if (stateKey === 'status') {
    return (
      <Stack gap={1}>
        <Grid columns={previewWidth < 60 ? 1 : 3}>
          <Stat label='Releases' value='24' hint='this month' tone='accent' />
          <Stat label='Warnings' value='2' hint='needs attention' tone='warning' />
          <Stat label='Incidents' value='0' hint='rolling 24h' tone='success' />
        </Grid>
        <Progress value={72} label='Canary confidence' color='#22c55e' />
        <Toast title='Event' message='Runtime command completed successfully.' tone='success' />
      </Stack>
    )
  }

  return (
    <Stack gap={1}>
      <Alert tone='success' title='Build complete' message='All packages built successfully and are ready for release.' />
      <Alert tone='warning' title='Compatibility' message='This release introduces a small API rename in the navigation primitives.' />
      <EmptyState
        title='Nothing blocking rollout'
        description='Empty states work well when a section has no current actions, items, or results.'
        icon='[]'
      />
      <Progress value={64} label='Rollout progress' color='#f97316' />
    </Stack>
  )
}
