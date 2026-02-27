import { useTuiTheme } from '../components/theme.js'

export { Form } from '../components/Form.js'
export { FormField as Input } from '../components/FormField.js'
export { SelectField as Select } from '../components/SelectField.js'
export { SchemaForm } from '../components/SchemaForm.js'
export { ProgressBar as Progress } from '../components/ProgressBar.js'
export { Stack } from '../components/Stack.js'
export { Panel } from '../components/Panel.js'
export { Card } from '../components/Card.js'
export { Alert } from '../components/Alert.js'
export { Badge } from '../components/Badge.js'
export { Divider } from '../components/Divider.js'
export { KeyValueList } from '../components/KeyValueList.js'
export { Stat } from '../components/Stat.js'
export {
  ThemeProvider,
  createTheme,
  useTuiTheme,
  darkThemeTokens,
  lightThemeTokens
} from '../components/theme.js'
export { useFormField } from '../components/form-context.js'
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
  SchemaFormProps,
  StackProps,
  PanelProps,
  CardProps,
  AlertProps,
  BadgeProps,
  DividerProps,
  KeyValueListProps,
  KeyValueItem,
  StatProps,
  TuiTheme,
  TuiThemeInput,
  TuiThemeTokens,
  SchemaField,
  TextSchemaField,
  SelectSchemaField,
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
