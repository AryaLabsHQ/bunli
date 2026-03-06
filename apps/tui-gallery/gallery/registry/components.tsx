import type { GallerySection } from '../model.js'
import { ChartPrimitivesExample } from '../examples/chart-primitives.js'
import { CredentialsFormExample } from '../examples/credentials-form.js'
import { FeedbackPrimitivesExample } from '../examples/feedback-primitives.js'
import { NavigationPrimitivesExample } from '../examples/navigation-primitives.js'
import { SurfaceCompositionExample } from '../examples/surface-composition.js'

export const componentExamplesSection: GallerySection = {
  id: 'components',
  title: 'Component Examples',
  categories: [
    {
      id: 'forms',
      title: 'Forms',
      description: 'Validation and field primitives',
      entries: [
        {
          id: 'credentials-form',
          kind: 'example',
          title: 'Credentials Form',
          summary: 'Interactive form example for Input + PasswordField + validation.',
          usage: [
            'Use Form when you want built-in submit/reset/error handling.',
            'Pair Input and PasswordField with schema validation for secure credential capture.'
          ],
          keybindings: ['Tab / Shift+Tab', 'Enter', 'Ctrl+S', 'Ctrl+R', 'Esc'],
          states: [
            { key: 'credentials', label: 'Credentials', description: 'Normal empty form' },
            { key: 'validation', label: 'Validation', description: 'Starts with invalid values' }
          ],
          sourceRefs: [
            { label: 'Form', path: 'packages/tui/src/components/form.tsx' },
            { label: 'PasswordField', path: 'packages/tui/src/components/password-field.tsx' },
            { label: 'Gallery implementation', path: 'apps/tui-gallery/gallery/examples/credentials-form.tsx' }
          ],
          render: (context) => <CredentialsFormExample {...context} />
        }
      ]
    },
    {
      id: 'layout',
      title: 'Layout / Display',
      description: 'Surfaces, grouping, and composition',
      entries: [
        {
          id: 'surface-composition',
          kind: 'example',
          title: 'Surface Composition',
          summary: 'Container, Panel, Card, Grid, SectionHeader, Divider, and Stat in one layout-focused example.',
          usage: [
            'Use Container as the outer shell and Panels/Cards for grouped content.',
            'Prefer Grid for compact metric clusters and Stack for explicit composition.'
          ],
          states: [
            { key: 'surfaces', label: 'Surfaces', description: 'Panels and cards' },
            { key: 'grid', label: 'Grid', description: 'Metric-heavy layout' }
          ],
          sourceRefs: [
            { label: 'Panel', path: 'packages/tui/src/components/panel.tsx' },
            { label: 'Grid', path: 'packages/tui/src/components/grid.tsx' },
            { label: 'SectionHeader', path: 'packages/tui/src/components/section-header.tsx' }
          ],
          render: (context) => <SurfaceCompositionExample {...context} />
        }
      ]
    },
    {
      id: 'feedback',
      title: 'Feedback / Status',
      description: 'Tones, states, and lightweight status',
      entries: [
        {
          id: 'feedback-primitives',
          kind: 'example',
          title: 'Feedback Primitives',
          summary: 'Alert, Badge, Progress, Toast, EmptyState, and Stat variants.',
          usage: [
            'Use alerts and toasts for event feedback.',
            'Use badges, progress, and stats for lightweight status communication.'
          ],
          states: [
            { key: 'alerts', label: 'Alerts', description: 'Alert + empty state' },
            { key: 'badges', label: 'Badges', description: 'Tone and emphasis sweep' },
            { key: 'status', label: 'Status', description: 'Stats + progress + toast' }
          ],
          sourceRefs: [
            { label: 'Alert', path: 'packages/tui/src/components/alert.tsx' },
            { label: 'Badge', path: 'packages/tui/src/components/badge.tsx' },
            { label: 'Progress', path: 'packages/tui/src/components/progress-bar.tsx' }
          ],
          render: (context) => <FeedbackPrimitivesExample {...context} />
        }
      ]
    },
    {
      id: 'navigation',
      title: 'Navigation / Data',
      description: 'Keyboard-first menus, tabs, tables, and palette',
      entries: [
        {
          id: 'navigation-primitives',
          kind: 'example',
          title: 'Navigation Primitives',
          summary: 'Menu, Tabs, DataTable, and CommandPalette as focused states of a single example.',
          usage: [
            'Use Menu and CommandPalette for command-oriented flows.',
            'Use Tabs and DataTable for in-place mode switches and browseable datasets.'
          ],
          keybindings: ['j/k', 'h/l', 'Enter'],
          states: [
            { key: 'menu', label: 'Menu', description: 'List-style action picker' },
            { key: 'tabs', label: 'Tabs', description: 'Inline view switching' },
            { key: 'table', label: 'Table', description: 'Row selection + sorting' },
            { key: 'palette', label: 'Palette', description: 'Filterable command launcher' }
          ],
          sourceRefs: [
            { label: 'Menu', path: 'packages/tui/src/components/menu.tsx' },
            { label: 'Tabs', path: 'packages/tui/src/components/tabs.tsx' },
            { label: 'DataTable', path: 'packages/tui/src/components/data-table.tsx' },
            { label: 'CommandPalette', path: 'packages/tui/src/components/command-palette.tsx' }
          ],
          render: (context) => <NavigationPrimitivesExample {...context} />
        }
      ]
    },
    {
      id: 'charts',
      title: 'Charts',
      description: 'Terminal-native data visualization',
      entries: [
        {
          id: 'chart-primitives',
          kind: 'example',
          title: 'Chart Primitives',
          summary: 'BarChart, LineChart, and Sparkline with multiple datasets.',
          usage: [
            'Use charts for compact trend and comparison views inside alternate-buffer screens.',
            'Bar charts work well for categorical comparisons; sparklines are better for compact trends.'
          ],
          states: [
            { key: 'release', label: 'Release', description: 'Weekly release activity' },
            { key: 'latency', label: 'Latency', description: 'Operational performance view' }
          ],
          sourceRefs: [{ label: 'Charts', path: 'packages/tui/src/charts/index.tsx' }],
          render: (context) => <ChartPrimitivesExample {...context} />
        }
      ]
    }
  ]
}
