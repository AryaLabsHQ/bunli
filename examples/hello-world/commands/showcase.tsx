import { defineCommand, option } from '@bunli/core'
import {
  Alert,
  Badge,
  Card,
  CommandPalette,
  Container,
  DataTable,
  Divider,
  EmptyState,
  Grid,
  KeyValueList,
  Menu,
  Modal,
  Panel,
  SectionHeader,
  Stack,
  Stat,
  Tabs,
  ThemeProvider,
  Toast,
  DialogDismissedError,
  useDialogManager,
  useKeyboard,
  useRenderer
} from '@bunli/tui/interactive'
import { BarChart, LineChart, Sparkline } from '@bunli/tui/charts'
import { useMemo, useState } from 'react'
import { z } from 'zod'

function ShowcaseScreen({ theme }: { theme: 'dark' | 'light' }) {
  const renderer = useRenderer()
  const dialogs = useDialogManager()
  const [showModal, setShowModal] = useState(false)
  const [lastMenuAction, setLastMenuAction] = useState('none')
  const [toast, setToast] = useState<string | null>(null)
  const [paletteSelection, setPaletteSelection] = useState('none')

  useKeyboard((key) => {
    if (key.name === 'q' || key.name === 'escape') {
      if (!renderer.isDestroyed) renderer.destroy()
      return
    }

    if (key.name === 'm') {
      setShowModal((prev) => !prev)
      return
    }

    if (key.name === 'c') {
      void (async () => {
        try {
          const confirmed = await dialogs.confirm({
            title: 'Publish release',
            message: 'Ship @bunli/tui changes now?',
            confirmLabel: 'Ship',
            cancelLabel: 'Hold'
          })
          setToast(confirmed ? 'Release confirmed' : 'Release held')
        } catch (error) {
          if (error instanceof DialogDismissedError) {
            setToast('Release dialog dismissed')
          } else {
            setToast(`Dialog error: ${String(error)}`)
          }
        }
      })()
      return
    }

    if (key.name === 'p') {
      void (async () => {
        try {
          const target = await dialogs.choose({
            title: 'Target environment',
            message: 'Select where to deploy this build:',
            options: [
              { label: 'Development', value: 'dev', hint: 'Safe default', section: 'General' },
              { label: 'Staging', value: 'staging', hint: 'Pre-production', section: 'General' },
              {
                label: 'Production',
                value: 'prod',
                hint: 'Live traffic',
                section: 'Protected',
                disabled: true
              }
            ]
          })
          setToast(`Selected environment: ${target}`)
        } catch (error) {
          if (error instanceof DialogDismissedError) {
            setToast('Environment picker dismissed')
          } else {
            setToast(`Dialog error: ${String(error)}`)
          }
        }
      })()
      return
    }

    if (key.name === 't') {
      setToast(`Toast at ${new Date().toLocaleTimeString()}`)
    }
  })

  const chartTab = useMemo(
    () => (
      <Stack gap={1}>
        <BarChart
          series={{
            name: 'Build durations',
            points: [
              { label: 'core', value: 18 },
              { label: 'tui', value: 27 },
              { label: 'docs', value: 9 }
            ]
          }}
        />
        <LineChart
          series={{
            name: 'Weekly releases',
            points: [
              { value: 1 },
              { value: 2 },
              { value: 1 },
              { value: 3 },
              { value: 4 }
            ]
          }}
        />
        <Sparkline values={[2, 6, 3, 7, 4, 9, 8]} />
      </Stack>
    ),
    []
  )

  return (
    <ThemeProvider theme={theme}>
      <Container border padding={1}>
        <SectionHeader
          title='@bunli/tui showcase'
          subtitle='Press q to quit, m modal, c confirm, p picker, t toast'
          trailing={<Badge label={theme} tone='accent' />}
        />

        <Divider />

        <Grid columns={3}>
          <Stat label='Commands' value={12} hint='active' tone='accent' />
          <Stat label='Tests' value='238/238' hint='passing' tone='success' />
          <Stat label='Warnings' value={0} hint='none' tone='default' />
        </Grid>

        <Stack direction='row' gap={2}>
          <Panel title='Feedback' subtitle='Tone variants'>
            <Alert tone='success' title='Build' message='All packages built successfully' />
            <Alert tone='warning' title='Compatibility' message='API is breaking in this release' />
          </Panel>

          <Panel title='Menu + Palette' subtitle='Keyboard driven components'>
            <Menu
              title='Actions'
              items={[
                { key: 'sync', label: 'Sync', description: 'Pull latest changes' },
                { key: 'release', label: 'Release', description: 'Prepare changeset' },
                { key: 'delete', label: 'Delete', description: 'Danger action', disabled: true }
              ]}
              onSelect={(key) => setLastMenuAction(key)}
            />
            <text content={`Last menu action: ${lastMenuAction}`} />
            <CommandPalette
              items={[
                { key: 'docs', label: 'Open docs', hint: 'Documentation' },
                { key: 'tests', label: 'Run tests', hint: 'Verification' },
                { key: 'build', label: 'Build packages', hint: 'Compile workspace' }
              ]}
              onSelect={(key) => setPaletteSelection(key)}
            />
            <text content={`Palette selection: ${paletteSelection}`} />
          </Panel>
        </Stack>

        <Tabs
          tabs={[
            {
              key: 'data',
              label: 'Data',
              content: (
                <Stack gap={1}>
                  <DataTable
                    columns={[
                      { key: 'pkg', label: 'Package' },
                      { key: 'version', label: 'Version' },
                      { key: 'status', label: 'Status' }
                    ]}
                    rows={[
                      { pkg: '@bunli/core', version: '0.6.1', status: 'stable' },
                      { pkg: '@bunli/tui', version: '0.4.1', status: 'stable' },
                      { pkg: '@bunli/utils', version: '0.4.0', status: 'deprecated prompts' }
                    ]}
                  />
                  <KeyValueList
                    items={[
                      { key: 'buffer mode', value: 'standard/alternate' },
                      { key: 'prompt owner', value: '@bunli/tui/prompt' },
                      { key: 'legacy clack', value: 'removed' }
                    ]}
                  />
                </Stack>
              )
            },
            {
              key: 'charts',
              label: 'Charts',
              content: chartTab
            }
          ]}
        />

        <Card title='Empty state'>
          <EmptyState
            title='No pending tasks'
            description='Everything is up to date for this environment.'
            icon='[]'
          />
        </Card>

        {toast ? <Toast tone='info' title='Event' message={toast} /> : null}

        <Modal isOpen={showModal} title='Modal dialog' onClose={() => setShowModal(false)}>
          <text content='This is a simple modal primitive for alternate-buffer interactions.' />
        </Modal>
      </Container>
    </ThemeProvider>
  )
}

const showcaseCommand = defineCommand({
  name: 'showcase' as const,
  description: 'Render a showcase of @bunli/tui interactive components',
  options: {
    theme: option(z.enum(['dark', 'light']).default('dark'), {
      short: 'm',
      description: 'Theme preset'
    })
  },
  render: ({ flags }) => <ShowcaseScreen theme={flags.theme as 'dark' | 'light'} />,
  handler: async ({ colors }) => {
    console.log(colors.bold('Run with --tui to view the interactive showcase'))
    console.log('Example: bun cli.ts showcase --tui')
  }
})

export default showcaseCommand
