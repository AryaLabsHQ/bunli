export { Form } from '../components/Form.js'
export { FormField as Input } from '../components/FormField.js'
export { SelectField as Select } from '../components/SelectField.js'
export { SchemaForm } from '../components/SchemaForm.js'
export { ProgressBar as Progress } from '../components/ProgressBar.js'
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
  SchemaField,
  TextSchemaField,
  SelectSchemaField,
  UseFormFieldOptions,
  UseFormFieldResult
} from '../components/index.js'

export interface ListProps {
  items: string[]
  ordered?: boolean
}

export function List({ items, ordered = false }: ListProps) {
  return (
    <box style={{ flexDirection: 'column' }}>
      {items.map((item, index) => (
        <text key={`${index}-${item}`} content={`${ordered ? `${index + 1}.` : '•'} ${item}`} />
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
  const widths = columns.map((col) => {
    const maxRowWidth = rows.reduce((max, row) => Math.max(max, String(row[col.key] ?? '').length), 0)
    return Math.max(col.label.length, maxRowWidth)
  })

  const header = columns.map((col, idx) => pad(col.label, widths[idx] ?? col.label.length)).join(' | ')
  const separator = widths.map((w) => '-'.repeat(w)).join('-+-')

  return (
    <box style={{ flexDirection: 'column' }}>
      <text content={header} />
      <text content={separator} />
      {rows.map((row, index) => {
        const line = columns
          .map((col, idx) => pad(String(row[col.key] ?? ''), widths[idx] ?? 1))
          .join(' | ')
        return <text key={`row-${index}`} content={line} />
      })}
    </box>
  )
}

export interface MarkdownProps {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  return <text content={content} />
}

export interface DiffProps {
  before: string
  after: string
}

export function Diff({ before, after }: DiffProps) {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  return (
    <box style={{ flexDirection: 'column' }}>
      {beforeLines.map((line, index) => <text key={`before-${index}`} content={`- ${line}`} />)}
      {afterLines.map((line, index) => <text key={`after-${index}`} content={`+ ${line}`} />)}
    </box>
  )
}
