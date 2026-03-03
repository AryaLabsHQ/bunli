import { useEffect } from 'react'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { SelectOption } from '@opentui/core'
import { Form, type FormProps } from './form.js'
import { FormField } from './form-field.js'
import { SelectField } from './select-field.js'
import { NumberField } from './number-field.js'
import { TextareaField } from './textarea-field.js'
import { PasswordField } from './password-field.js'
import { CheckboxField } from './checkbox-field.js'
import { MultiSelectField } from './multi-select-field.js'
import { useFormContext } from './form-context.js'

type FormOutput<TSchema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<TSchema>
type SchemaFieldName<TSchema extends StandardSchemaV1> = keyof FormOutput<TSchema> & string

interface BaseSchemaField<TSchema extends StandardSchemaV1> {
  name: SchemaFieldName<TSchema>
  label: string
  required?: boolean
  description?: string
  visibleWhen?: (values: Partial<FormOutput<TSchema>>) => boolean
  deriveDefault?: (values: Partial<FormOutput<TSchema>>) => unknown
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

export interface MultiSelectSchemaField<TSchema extends StandardSchemaV1> extends BaseSchemaField<TSchema> {
  kind: 'multiselect'
  options: SelectOption[]
  defaultValue?: Array<SelectOption['value']>
}

export interface NumberSchemaField<TSchema extends StandardSchemaV1> extends BaseSchemaField<TSchema> {
  kind: 'number'
  placeholder?: string
  defaultValue?: number
}

export interface PasswordSchemaField<TSchema extends StandardSchemaV1> extends BaseSchemaField<TSchema> {
  kind: 'password'
  placeholder?: string
  defaultValue?: string
}

export interface TextareaSchemaField<TSchema extends StandardSchemaV1> extends BaseSchemaField<TSchema> {
  kind: 'textarea'
  placeholder?: string
  defaultValue?: string
}

export interface CheckboxSchemaField<TSchema extends StandardSchemaV1> extends BaseSchemaField<TSchema> {
  kind: 'checkbox'
  defaultValue?: boolean
}

export type SchemaField<TSchema extends StandardSchemaV1> =
  | TextSchemaField<TSchema>
  | SelectSchemaField<TSchema>
  | MultiSelectSchemaField<TSchema>
  | NumberSchemaField<TSchema>
  | PasswordSchemaField<TSchema>
  | TextareaSchemaField<TSchema>
  | CheckboxSchemaField<TSchema>

export interface SchemaFormProps<TSchema extends StandardSchemaV1>
  extends Omit<FormProps<TSchema>, 'children'> {
  fields: SchemaField<TSchema>[]
}

function SchemaFieldsRenderer<TSchema extends StandardSchemaV1>({
  fields
}: {
  fields: SchemaField<TSchema>[]
}) {
  const context = useFormContext()
  const values = context.values as Partial<FormOutput<TSchema>>

  useEffect(() => {
    for (const field of fields) {
      if (!field.deriveDefault) continue
      if (context.values[field.name] !== undefined) continue
      const derived = field.deriveDefault(values)
      if (derived !== undefined) {
        context.setFieldValue(field.name, derived)
      }
    }
  }, [context, fields, values])

  return (
    <>
      {fields.map((field) => {
        const visible = field.visibleWhen ? field.visibleWhen(values) : true
        if (!visible) return null

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

        if (field.kind === 'multiselect') {
          return (
            <MultiSelectField
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

        if (field.kind === 'number') {
          return (
            <NumberField
              key={field.name}
              name={field.name}
              label={field.label}
              placeholder={field.placeholder}
              defaultValue={field.defaultValue}
              required={field.required}
              description={field.description}
            />
          )
        }

        if (field.kind === 'password') {
          return (
            <PasswordField
              key={field.name}
              name={field.name}
              label={field.label}
              placeholder={field.placeholder}
              defaultValue={field.defaultValue}
              required={field.required}
              description={field.description}
            />
          )
        }

        if (field.kind === 'textarea') {
          return (
            <TextareaField
              key={field.name}
              name={field.name}
              label={field.label}
              placeholder={field.placeholder}
              defaultValue={field.defaultValue}
              required={field.required}
              description={field.description}
            />
          )
        }

        if (field.kind === 'checkbox') {
          return (
            <CheckboxField
              key={field.name}
              name={field.name}
              label={field.label}
              defaultValue={field.defaultValue}
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
    </>
  )
}

export function SchemaForm<TSchema extends StandardSchemaV1>({
  fields,
  ...formProps
}: SchemaFormProps<TSchema>) {
  return (
    <Form {...formProps}>
      <SchemaFieldsRenderer fields={fields} />
    </Form>
  )
}
