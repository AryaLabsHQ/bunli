import {
  Badge,
  Card,
  Container,
  Divider,
  Grid,
  Panel,
  SectionHeader,
  Stack,
  Stat
} from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

export function SurfaceCompositionExample({ previewWidth, stateKey }: GalleryRenderContext) {
  const showStats = stateKey === 'grid'

  return (
    <Stack gap={1}>
      <SectionHeader
        title='Composable Surfaces'
        subtitle='Container + Panel + Card + Grid + SectionHeader'
        trailing={<Badge label={showStats ? 'grid' : 'surfaces'} tone='accent' />}
      />
      <Container border padding={1}>
        <Panel title='Primary Surface' subtitle='Use panels for grouped information' tone='accent' emphasis='outline'>
          <text content='Panels, cards, and stacks are the main layout building blocks for alternate-buffer views.' />
          <Divider />
          {showStats ? (
            <Grid columns={Math.max(1, previewWidth < 60 ? 1 : 2)}>
              <Stat label='Commands' value='18' hint='registered' tone='accent' />
              <Stat label='Latency' value='128ms' hint='p95' tone='success' />
              <Stat label='Queue' value='4' hint='active' tone='warning' />
              <Stat label='Errors' value='0' hint='last hour' tone='default' />
            </Grid>
          ) : (
            <Stack direction='row' gap={2}>
              <Card title='Left Rail' description='Compact secondary grouping'>
                <text content='Card surfaces are good for smaller grouped callouts or status bundles.' />
              </Card>
              <Card title='Right Rail' description='Paired content area' tone='success'>
                <text content='Mix cards with grids and stacks to build compact dashboard-like layouts.' />
              </Card>
            </Stack>
          )}
        </Panel>
      </Container>
    </Stack>
  )
}
