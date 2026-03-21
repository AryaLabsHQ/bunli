import { useTuiTheme } from '@bunli/runtime/app'
export { useKeyboard, useRenderer, useOnResize, useTerminalDimensions, useTimeline } from '@opentui/react'
export { createSyncBatcher, type SyncBatcher, type SyncBatcherOptions } from '../utils/sync-batcher.js'

export { Form } from '../components/form.js'
export { FormField as Input } from '../components/form-field.js'
export { SelectField as Select } from '../components/select-field.js'
export { MultiSelectField as MultiSelect } from '../components/multi-select-field.js'
export { NumberField } from '../components/number-field.js'
export { PasswordField } from '../components/password-field.js'
export { TextareaField } from '../components/textarea-field.js'
export { CheckboxField } from '../components/checkbox-field.js'
export { SchemaForm } from '../components/schema-form.js'
export { ProgressBar as Progress } from '../components/progress-bar.js'
export { Stack } from '../components/stack.js'
export { Panel } from '../components/panel.js'
export { ScrollPanel } from '../components/scroll-panel.js'
export { Card } from '../components/card.js'
export { Alert } from '../components/alert.js'
export { Badge } from '../components/badge.js'
export { Divider } from '../components/divider.js'
export { KeyValueList } from '../components/key-value-list.js'
export { Stat } from '../components/stat.js'
export { Container } from '../components/container.js'
export { Grid } from '../components/grid.js'
export { SectionHeader } from '../components/section-header.js'
export { EmptyState } from '../components/empty-state.js'
export { Toast } from '../components/toast.js'
export { Modal } from '../components/modal.js'
export { Tabs } from '../components/tabs.js'
export { Menu } from '../components/menu.js'
export { NavList, moveSelectableNavIndex } from '../components/nav-list.js'
export { CommandPalette } from '../components/command-palette.js'
export { DataTable } from '../components/data-table.js'
export { SidebarLayout, resolveSidebarLayoutMode } from '../components/sidebar-layout.js'
export { Spinner } from '../components/spinner.js'
export {
  ThemeProvider,
  createTheme,
  useTuiTheme,
  darkThemeTokens,
  lightThemeTokens
} from '@bunli/runtime/app'
export { useFormField } from '../components/form-context.js'
export { createKeyMatcher, matchesKeyBinding, eventToBinding } from '@bunli/runtime/app'
export {
  validateFormValues,
  toFormErrors,
  type FormErrors,
  type ValidationResult
} from '../components/form-engine.js'
export type {
  FormProps,
  FormFieldProps,
  SelectFieldProps,
  MultiSelectFieldProps,
  NumberFieldProps,
  PasswordFieldProps,
  TextareaFieldProps,
  CheckboxFieldProps,
  SchemaFormProps,
  StackProps,
  PanelProps,
  ScrollPanelProps,
  ScrollPanelScrollbarOptions,
  CardProps,
  AlertProps,
  BadgeProps,
  DividerProps,
  KeyValueListProps,
  KeyValueItem,
  StatProps,
  ContainerProps,
  GridProps,
  SectionHeaderProps,
  EmptyStateProps,
  ToastProps,
  ModalProps,
  TabsProps,
  TabItem,
  MenuProps,
  MenuItem,
  NavListProps,
  NavListItem,
  CommandPaletteProps,
  CommandPaletteItem,
  DataTableProps,
  DataTableColumn,
  SidebarLayoutProps,
  SidebarLayoutMode,
  SidebarLayoutResolvedMode,
  SidebarLayoutPane,
  SidebarLayoutPaneLabels,
  SpinnerProps,
  SpinnerVariant,
  TuiTheme,
  TuiThemeInput,
  TuiThemeTokens,
  ComponentTone,
  ComponentSize,
  ComponentEmphasis,
  VariantResolutionInput,
  VariantStyle,
  SchemaField,
  TextSchemaField,
  SelectSchemaField,
  MultiSelectSchemaField,
  NumberSchemaField,
  PasswordSchemaField,
  TextareaSchemaField,
  CheckboxSchemaField,
  KeyBinding,
  UseFormFieldOptions,
  UseFormFieldResult
} from '../components/index.js'

export interface ListProps {
  items: string[]
  ordered?: boolean
  bullet?: string
}

export function List({ items, ordered = false, bullet = '•' }: ListProps) {
  const { tokens } = useTuiTheme()

  return (
    <box style={{ flexDirection: 'column' }}>
      {items.map((item, index) => (
        <text
          key={`${index}-${item}`}
          content={`${ordered ? `${index + 1}.` : bullet} ${item}`}
          fg={tokens.textPrimary}
        />
      ))}
    </box>
  )
}

export interface TableColumn {
  key: string
  label: string
}

export interface TableProps {
  columns: TableColumn[]
  rows: Array<Record<string, string | number | boolean | null | undefined>>
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${' '.repeat(width - value.length)}`
}

export function Table({ columns, rows }: TableProps) {
  const { tokens } = useTuiTheme()
  const widths = columns.map((col) => {
    const maxRowWidth = rows.reduce((max, row) => Math.max(max, String(row[col.key] ?? '').length), 0)
    return Math.max(col.label.length, maxRowWidth)
  })

  const header = columns.map((col, idx) => pad(col.label, widths[idx] ?? col.label.length)).join(' | ')
  const separator = widths.map((w) => '-'.repeat(w)).join('-+-')

  return (
    <box style={{ flexDirection: 'column' }}>
      <text content={header} fg={tokens.textPrimary} />
      <text content={separator} fg={tokens.borderMuted} />
      {rows.map((row, index) => {
        const line = columns
          .map((col, idx) => pad(String(row[col.key] ?? ''), widths[idx] ?? 1))
          .join(' | ')
        return <text key={`row-${index}`} content={line} fg={tokens.textPrimary} />
      })}
    </box>
  )
}

export interface MarkdownProps {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  const { tokens } = useTuiTheme()
  return <text content={content} fg={tokens.textPrimary} />
}

export interface DiffProps {
  before: string
  after: string
}

export function Diff({ before, after }: DiffProps) {
  const { tokens } = useTuiTheme()
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  return (
    <box style={{ flexDirection: 'column' }}>
      {beforeLines.map((line, index) => (
        <text key={`before-${index}`} content={`- ${line}`} fg={tokens.textDanger} />
      ))}
      {afterLines.map((line, index) => (
        <text key={`after-${index}`} content={`+ ${line}`} fg={tokens.textSuccess} />
      ))}
    </box>
  )
}
