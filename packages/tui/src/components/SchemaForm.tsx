import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { SelectOption } from '@opentui/core'
import { Form, type FormProps } from './Form.js'
import { FormField } from './FormField.js'
import { SelectField } from './SelectField.js'

type FormOutput<TSchema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<TSchema>
type SchemaFieldName<TSchema extends StandardSchemaV1> = keyof FormOutput<TSchema> & string

interface BaseSchemaField<TSchema extends StandardSchemaV1> {
  name: SchemaFieldName<TSchema>
  label: string
  required?: boolean
  description?: string
}

export interface TextSchemaField<TSchema extends StandardSchemaV1> extends BaseSchemaField<TSchema> {
  kind: 'text'
  placeholder?: string
  defaultValue?: string
}

export interface SelectSchemaField<TSchema extends StandardSchemaV1> extends BaseSchemaField<TSchema> {
  kind: 'select'
  options: SelectOption[]
  defaultValue?: SelectOption['value']
}

export type SchemaField<TSchema extends StandardSchemaV1> =
  | TextSchemaField<TSchema>
  | SelectSchemaField<TSchema>

export interface SchemaFormProps<TSchema extends StandardSchemaV1>
  extends Omit<FormProps<TSchema>, 'children'> {
  fields: SchemaField<TSchema>[]
}

export function SchemaForm<TSchema extends StandardSchemaV1>({
  fields,
  ...formProps
}: SchemaFormProps<TSchema>) {
  return (
    <Form {...formProps}>
      {fields.map((field) => {
        if (field.kind === 'select') {
          return (
            <SelectField
              key={field.name}
              name={field.name}
              label={field.label}
              options={field.options}
              defaultValue={field.defaultValue}
              required={field.required}
              description={field.description}
            />
          )
        }

        return (
          <FormField
            key={field.name}
            name={field.name}
            label={field.label}
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            required={field.required}
            description={field.description}
          />
        )
      })}
    </Form>
  )
}
